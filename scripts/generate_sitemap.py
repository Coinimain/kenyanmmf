import os, gzip, datetime, xml.etree.ElementTree as ET
from pathlib import Path
from subprocess import check_output, CalledProcessError

# --- CONFIG ---
BASE_URL = "https://kenyammfcalculator.co.ke"
SITE_ROOT = Path(".")   # repo root; change if your site lives in /docs
INCLUDE_EXT = {".html"} # only include real pages
EXCLUDE_FILES = {
    "404.html", "footer.html", "header.html", "nav.html",
    "README.html"
}
EXCLUDE_DIRS = {"scripts", ".github", ".git", "node_modules"}
TODAY = datetime.date.today().isoformat()  # YYYY-MM-DD

def last_commit_date(path: Path) -> str:
    """Return last commit date (YYYY-MM-DD) for path via git; fallback to TODAY."""
    try:
        iso = check_output(["git", "log", "-1", "--format=%cI", str(path)]).decode().strip()
        return iso.split("T", 1)[0]
    except (CalledProcessError, FileNotFoundError):
        return TODAY

def iter_pages(root: Path):
    for p in root.rglob("*.html"):
        # skip hidden, excluded dirs
        parts = set(p.parts)
        if parts & EXCLUDE_DIRS:
            continue
        if any(s.startswith(".") for s in p.parts):
            continue
        if p.name in EXCLUDE_FILES:
            continue
        yield p

def url_for(path: Path) -> str:
    # Map index.html to folder URL, others to /file.html
    rel = path.relative_to(SITE_ROOT).as_posix()
    if rel.endswith("index.html"):
        url = rel[:-10]  # strip "index.html"
        if url and not url.endswith("/"):  # e.g. subdir/index.html
            url += "/"
        return f"{BASE_URL}/{url}".replace("//", "/").replace(":/", "://")
    return f"{BASE_URL}/{rel}"

def build_urlset(urls):
    ns = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace("", ns)
    urlset = ET.Element("{%s}urlset" % ns)
    for loc, lastmod in urls:
        u = ET.SubElement(urlset, "{%s}url" % ns)
        ET.SubElement(u, "{%s}loc" % ns).text = loc
        ET.SubElement(u, "{%s}lastmod" % ns).text = lastmod
        # Optional hints; tweak as you like
        # ET.SubElement(u, "{%s}changefreq" % ns).text = "weekly"
        # ET.SubElement(u, "{%s}priority" % ns).text = "0.7"
    return urlset

def write_xml(root_elem, path: Path):
    tree = ET.ElementTree(root_elem)
    tree.write(path, encoding="utf-8", xml_declaration=True)

def gzip_file(src: Path, dst: Path):
    with open(src, "rb") as f_in, gzip.open(dst, "wb") as f_out:
        f_out.writelines(f_in)

def build_index(entries):
    ns = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace("", ns)
    idx = ET.Element("{%s}sitemapindex" % ns)
    for loc, lastmod in entries:
        sm = ET.SubElement(idx, "{%s}sitemap" % ns)
        ET.SubElement(sm, "{%s}loc" % ns).text = loc
        ET.SubElement(sm, "{%s}lastmod" % ns).text = lastmod
    return idx

def ensure_robots(points_to: str):
    path = Path("robots.txt")
    lines = []
    if path.exists():
        lines = path.read_text(encoding="utf-8").splitlines()
        # remove old "Sitemap:" lines
        lines = [ln for ln in lines if not ln.strip().lower().startswith("sitemap:")]
    else:
        lines = ["User-agent: *", "Allow: /", ""]
    lines += [f"Sitemap: {points_to}"]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")

def main():
    pages = sorted(iter_pages(SITE_ROOT))
    if not pages:
        print("No .html pages found; did you set SITE_ROOT correctly?")
    url_rows = []
    for p in pages:
        loc = url_for(p)
        lm = last_commit_date(p)
        url_rows.append((loc, lm))

    # Always include homepage if index.html exists at root
    root_index = SITE_ROOT / "index.html"
    if root_index.exists():
        homepage = url_for(root_index)
        lm = last_commit_date(root_index)
        if (homepage, lm) not in url_rows:
            url_rows.insert(0, (homepage, lm))

    # Write sitemap.xml
    urlset = build_urlset(url_rows)
    sitemap_xml = Path("sitemap.xml")
    write_xml(urlset, sitemap_xml)

    # Write sitemap.xml.gz
    sitemap_gz = Path("sitemap.xml.gz")
    gzip_file(sitemap_xml, sitemap_gz)

    # Write sitemap_index.xml referencing both
    today = TODAY
    index_entries = [
        (f"{BASE_URL}/sitemap.xml.gz", today),
        (f"{BASE_URL}/sitemap.xml", today),
    ]
    idx = build_index(index_entries)
    write_xml(idx, Path("sitemap_index.xml"))

    # Ensure robots.txt points to the index
    ensure_robots(f"{BASE_URL}/sitemap_index.xml")

    print(f"Wrote {sitemap_xml}, {sitemap_gz}, sitemap_index.xml, robots.txt")

if __name__ == "__main__":
    main()
