#!/usr/bin/env python3
import os
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

# ---- Config you can tweak ----
REQUIRED_FRONT_MATTER_KEYS = {"title", "description", "permalink"}
SCAN_DIRS = ["_posts", "_pages", ""]  # "" means repo root too (for standalone pages)
SCAN_EXTS = {".md", ".markdown", ".html"}

# For "floating" URL detection:
URL_RE = re.compile(r"https?://[^\s)>\]]+")
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
HTML_HREF_RE = re.compile(r'href\s*=\s*"([^"]+)"', re.IGNORECASE)

# code fence stripping (so we don't flag URLs inside code blocks)
FENCED_BLOCK_RE = re.compile(r"```.*?```", re.DOTALL)

# IGNORE raw GitHub links (allowed to appear as-is)
IGNORE_URL_PREFIXES = (
    "https://github.com/",
    "https://raw.githubusercontent.com/",
    "https://gist.github.com/",
)

def gh_annot(level: str, file: Path, line: int, col: int, message: str):
    rel = file.relative_to(REPO_ROOT)
    print(f"::{level} file={rel},line={line},col={col}::{message}")

def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8-sig")

def split_front_matter(text: str):
    if text.startswith("---"):
        lines = text.splitlines()
        for i in range(1, min(len(lines), 200)):
            if lines[i].strip() == "---":
                fm = "\n".join(lines[1:i])
                body = "\n".join(lines[i+1:])
                return fm, body
    return "", text

def parse_front_matter(fm: str):
    keys = set()
    duplicates = set()
    for line in fm.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        m = re.match(r"^([A-Za-z0-9_\-]+)\s*:", stripped)
        if m:
            k = m.group(1)
            if k in keys:
                duplicates.add(k)
            keys.add(k)
    return keys, duplicates

def strip_query_fragment(url: str) -> str:
    url = url.split("#", 1)[0]
    url = url.split("?", 1)[0]
    return url

def file_line_index(text: str):
    line_starts = [0]
    for m in re.finditer(r"\n", text):
        line_starts.append(m.end())
    def idx_to_line_col(idx: int):
        lo, hi = 0, len(line_starts) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if line_starts[mid] <= idx:
                lo = mid + 1
            else:
                hi = mid - 1
        line = hi + 1
        col = idx - line_starts[hi] + 1
        return line, col
    return idx_to_line_col

def is_inside_markdown_link(text: str, idx: int) -> bool:
    for m in MD_LINK_RE.finditer(text):
        start, end = m.span(2)
        if start <= idx <= end:
            return True
    return False

def is_ignored_url(url: str) -> bool:
    return url.startswith(IGNORE_URL_PREFIXES)

def check_front_matter(path: Path, text: str) -> int:
    errors = 0
    fm, body = split_front_matter(text)
    if path.suffix in {".md", ".markdown"}:
        if not fm:
            gh_annot("error", path, 1, 1, "Missing YAML front matter (expected starting '---').")
            return 1

        keys, dups = parse_front_matter(fm)
        missing = REQUIRED_FRONT_MATTER_KEYS - keys
        if missing:
            gh_annot("error", path, 1, 1, f"Missing required front matter keys: {', '.join(sorted(missing))}")
            errors += 1

        if dups:
            gh_annot("warning", path, 1, 1, f"Duplicate front matter keys detected: {', '.join(sorted(dups))}")

        pm = None
        for line in fm.splitlines():
            if line.strip().lower().startswith("permalink:"):
                pm = line.split(":", 1)[1].strip().strip('"').strip("'")
                break
        if pm is not None:
            if not pm.startswith("/"):
                gh_annot("error", path, 1, 1, f'permalink should start with "/": got "{pm}"')
                errors += 1
            if not pm.endswith("/"):
                gh_annot("warning", path, 1, 1, f'permalink usually should end with "/": got "{pm}"')
    return errors

def check_floating_urls(path: Path, text: str) -> int:
    errors = 0
    idx_to_line_col = file_line_index(text)
    scrubbed = re.sub(FENCED_BLOCK_RE, "", text)

    for m in URL_RE.finditer(scrubbed):
        url = m.group(0)
        if is_ignored_url(url):
            continue

        idx = m.start()
        if is_inside_markdown_link(scrubbed, idx):
            continue

        # Allow URLs wrapped in <...> (autolink)
        if idx > 0 and scrubbed[idx - 1] == "<":
            continue

        line, col = idx_to_line_col(idx)
        gh_annot(
            "error",
            path,
            line,
            col,
            f'Floating URL found (wrap it): "{url}". Use [link text]({url}) or <{url}>.'
        )
        errors += 1

    return errors

def check_markdown_links(path: Path, text: str) -> int:
    errors = 0
    idx_to_line_col = file_line_index(text)

    for m in MD_LINK_RE.finditer(text):
        label = (m.group(1) or "").strip()
        target = (m.group(2) or "").strip()

        if not label:
            line, col = idx_to_line_col(m.start())
            gh_annot("error", path, line, col, "Markdown link has empty link text: [](url)")
            errors += 1

        if not target:
            line, col = idx_to_line_col(m.start())
            gh_annot("error", path, line, col, "Markdown link has empty URL: [text]()")
            errors += 1

    return errors

def check_internal_assets(path: Path, text: str) -> int:
    errors = 0
    idx_to_line_col = file_line_index(text)

    def verify_url(raw_url: str, at_idx: int):
        nonlocal errors
        url = raw_url.strip()
        if not url.startswith("/"):
            return
        if url.startswith("/assets/") or url.startswith("/images/"):
            p = strip_query_fragment(url).lstrip("/")
            candidate = REPO_ROOT / p
            if not candidate.exists():
                line, col = idx_to_line_col(at_idx)
                gh_annot("error", path, line, col, f'Broken asset link: "{url}" (file not found: {p})')
                errors += 1

    for m in MD_LINK_RE.finditer(text):
        verify_url(m.group(2), m.start(2))

    for m in HTML_HREF_RE.finditer(text):
        verify_url(m.group(1), m.start(1))

    return errors

def iter_files():
    seen = set()
    for d in SCAN_DIRS:
        base = REPO_ROOT / d if d else REPO_ROOT
        if not base.exists():
            continue
        for p in base.rglob("*"):
            if p.is_file() and p.suffix.lower() in SCAN_EXTS:
                if any(part in {"_site", ".git", "node_modules", "vendor"} for part in p.parts):
                    continue
                if p in seen:
                    continue
                seen.add(p)
                yield p

def main():
    total_errors = 0
    files_checked = 0

    for path in iter_files():
        files_checked += 1
        text = read_text(path)

        total_errors += check_front_matter(path, text)

        # No raw URLs in markdown (except allowed GitHub)
        if path.suffix.lower() in {".md", ".markdown"}:
            total_errors += check_floating_urls(path, text)
            total_errors += check_markdown_links(path, text)

        total_errors += check_internal_assets(path, text)

    print("\n---")
    print(f"Checked files: {files_checked}")
    print(f"Total errors: {total_errors}")

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as f:
            f.write("## Site Quality Check Results\n")
            f.write(f"- Files checked: **{files_checked}**\n")
            f.write(f"- Errors: **{total_errors}**\n")

    if total_errors > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
