#!/usr/bin/env python3
"""Update the NSE market dashboard datasets from the NSE Daily Price List PDF.

The NSE publishes a dated PDF at DD-MMM-YY.pdf. This script downloads the
requested trading day's file, validates it, extracts listed-security prices,
index closes and headline market statistics, then appends the results to CSV
history files used by the Jekyll dashboard.

Missing PDFs are a normal no-op (weekends, holidays, or a late publication).
A PDF that exists but cannot be parsed confidently raises an error and leaves
existing CSV files untouched.
"""

from __future__ import annotations

import csv
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Iterable

BASE_URL = "https://www.nse.co.ke/wp-content/uploads/{stamp}.pdf"
NSE_PAGE = "https://www.nse.co.ke/"
PRICES_FILE = Path("nse-market-prices.csv")
INDICES_FILE = Path("nse-market-indices.csv")
SUMMARY_FILE = Path("nse-market-summary.csv")
USER_AGENT = "Mozilla/5.0 (compatible; KenyaMMFCalculator/1.0; +https://kenyammfcalculator.co.ke/)"

PRICE_FIELDS = [
    "Date", "Sector", "Security", "ISIN", "Trading Status", "52W High", "52W Low",
    "High", "Low", "VWAP", "Previous Price", "Change", "Change (%)", "Volume", "Source"
]
INDEX_FIELDS = ["Date", "Index", "Close", "Change", "Previous", "Change (%)", "Source"]
SUMMARY_FIELDS = [
    "Date", "Market Capitalization (KES bn)", "Previous Market Capitalization (KES bn)",
    "Shares Traded", "Previous Shares Traded", "Equity Turnover (KES)",
    "Previous Equity Turnover (KES)", "Total Deals", "Previous Total Deals", "Source"
]

SECTORS = [
    "AGRICULTURAL", "AUTOMOBILES & ACCESSORIES", "BANKING", "COMMERCIAL AND SERVICES",
    "CONSTRUCTION & ALLIED", "ENERGY & PETROLEUM", "INSURANCE", "INVESTMENT",
    "INVESTMENT SERVICES", "MANUFACTURING & ALLIED", "TELECOMMUNICATION",
    "REAL ESTATE INVESTMENT TRUST", "EXCHANGE TRADED FUNDS"
]
INDEX_NAMES = [
    "NSE All Share Index (NASI)", "NSE 20 Share Index", "NSE 25 Share Index",
    "NSE 10 Share Index", "NSE Banking Sector Index"
]

@dataclass(frozen=True)
class OCRWord:
    text: str
    left: int
    top: int
    width: int
    height: int
    confidence: float

    @property
    def center_y(self) -> float:
        return self.top + self.height / 2


def url_for(day: date) -> str:
    return BASE_URL.format(stamp=day.strftime("%d-%b-%y").upper())


def download_pdf(day: date) -> tuple[bytes | None, str]:
    local_path = os.environ.get("NSE_PDF_PATH", "").strip()
    if local_path:
        p = Path(local_path)
        return p.read_bytes(), p.resolve().as_uri()

    url = url_for(day)
    req = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "application/pdf,*/*;q=0.8",
        "Referer": NSE_PAGE,
    })
    try:
        with urllib.request.urlopen(req, timeout=40) as response:
            body = response.read()
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None, url
        raise
    except urllib.error.URLError as exc:
        raise RuntimeError(f"could not reach NSE: {exc}") from exc

    return body, url


def require_pdf(body: bytes) -> None:
    if not body.startswith(b"%PDF") or len(body) < 50_000:
        raise ValueError("NSE response was not a usable PDF")


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    try:
        env = os.environ.copy()
        if cmd and Path(cmd[0]).name == "tesseract":
            env.setdefault("OMP_THREAD_LIMIT", "1")
        return subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=75, env=env)
    except FileNotFoundError as exc:
        raise RuntimeError(f"required command not found: {cmd[0]}") from exc
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f"{cmd[0]} timed out") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"{cmd[0]} failed: {exc.stderr.strip()}") from exc


def extract_page_images(pdf_path: Path, tmpdir: Path) -> list[Path]:
    prefix = tmpdir / "nse-daily"
    run(["pdfimages", "-f", "1", "-l", "2", "-png", str(pdf_path), str(prefix)])
    images = sorted(tmpdir.glob("nse-daily-*.png"))
    if len(images) < 2:
        raise ValueError("NSE Daily Price List did not contain the expected first two page images")
    # Current NSE files contain one large full-page image per page. If extra assets
    # appear, the two largest are the actual table pages; retain their filename order.
    if len(images) > 2:
        images = sorted(sorted(images, key=lambda p: p.stat().st_size, reverse=True)[:2])
    return images



def imagemagick_tool() -> str:
    from shutil import which
    tool = which("magick") or which("convert")
    if not tool:
        raise RuntimeError("ImageMagick is required for NSE dashboard OCR")
    return tool


def image_dimensions(image: Path) -> tuple[int, int]:
    tool = imagemagick_tool()
    if Path(tool).name == "magick":
        proc = run([tool, "identify", "-format", "%w %h", str(image)])
    else:
        proc = run(["identify", "-format", "%w %h", str(image)])
    parts = proc.stdout.strip().split()
    if len(parts) < 2:
        raise RuntimeError("could not determine NSE page image dimensions")
    return int(parts[0]), int(parts[1])


def crop_top(image: Path, tmpdir: Path, name: str, height_ratio: float) -> Path:
    tool = imagemagick_tool()
    w, h = image_dimensions(image)
    out = tmpdir / f"{name}.png"
    geometry = f"{w}x{int(h * height_ratio)}+0+0"
    if Path(tool).name == "magick":
        run([tool, str(image), "-crop", geometry, "+repage", str(out)])
    else:
        run([tool, str(image), "-crop", geometry, "+repage", str(out)])
    return out

def tesseract_words(image: Path, psm: int = 3) -> list[OCRWord]:
    proc = run(["tesseract", str(image), "stdout", "-l", "eng", "--psm", str(psm), "tsv"])
    reader = csv.DictReader(proc.stdout.splitlines(), delimiter="\t")
    out: list[OCRWord] = []
    for row in reader:
        text = (row.get("text") or "").strip()
        if not text:
            continue
        try:
            conf = float(row.get("conf") or -1)
            left = int(row.get("left") or 0)
            top = int(row.get("top") or 0)
            width = int(row.get("width") or 0)
            height = int(row.get("height") or 0)
        except ValueError:
            continue
        if conf < 5 or width <= 0 or height <= 0:
            continue
        out.append(OCRWord(text, left, top, width, height, conf))
    return out


def cluster_lines(words: list[OCRWord]) -> list[list[OCRWord]]:
    if not words:
        return []
    heights = sorted(w.height for w in words)
    median_height = heights[len(heights) // 2]
    tolerance = max(5.0, min(20.0, median_height * 0.62))
    lines: list[list[OCRWord]] = []
    centers: list[float] = []
    for word in sorted(words, key=lambda w: (w.center_y, w.left)):
        idx = None
        best = None
        for i in range(max(0, len(lines) - 5), len(lines)):
            dist = abs(word.center_y - centers[i])
            if dist <= tolerance and (best is None or dist < best):
                idx, best = i, dist
        if idx is None:
            lines.append([word])
            centers.append(word.center_y)
        else:
            lines[idx].append(word)
            centers[idx] = sum(w.center_y for w in lines[idx]) / len(lines[idx])
    for line in lines:
        line.sort(key=lambda w: w.left)
    return sorted(lines, key=lambda line: sum(w.center_y for w in line) / len(line))


def line_text(line: Iterable[OCRWord]) -> str:
    return " ".join(w.text for w in line)


def normalized(text: str) -> str:
    return re.sub(r"[^A-Z0-9]+", " ", text.upper()).strip()


def parse_num(raw: str) -> float | None:
    s = re.sub(r"[^0-9.,-]", "", raw.strip())
    if not s or s in {"-", ".", ","}:
        return None
    if "." in s and "," in s:
        s = s.replace(",", "")
    elif "," in s:
        if re.fullmatch(r"\d{1,3}(?:,\d{3})+", s):
            s = s.replace(",", "")
        elif s.count(",") == 1 and len(s.rsplit(",", 1)[1]) <= 2:
            s = s.replace(",", ".")
        else:
            s = s.replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


def fmt_number(v: float | None, decimals: int = 2) -> str:
    if v is None:
        return ""
    return f"{v:.{decimals}f}".rstrip("0").rstrip(".")


def clean_isin(raw: str) -> str:
    s = re.sub(r"[^A-Za-z0-9]", "", raw).upper()
    # Common OCR error in the country prefix.
    if len(s) >= 2 and s[0] == "K" and s[1] in {"E", "F"}:
        s = "KE" + s[2:]
    return s


def clean_security(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip(" -")
    return text


def price_from_bucket(line: list[OCRWord], lo: float, hi: float, width: int) -> tuple[float | None, str]:
    vals = [w for w in line if lo * width <= w.left < hi * width]
    if not vals:
        return None, ""
    raw = "".join(w.text for w in vals)
    return parse_num(raw), raw


def repair_price(value: float | None, raw: str, week_high: float | None) -> float | None:
    if value is None or week_high is None or week_high <= 0:
        return value
    # OCR sometimes drops the decimal point (1.99 -> 199, 7.54 -> 754).
    if re.fullmatch(r"\d{2,4}", re.sub(r"\D", "", raw)) and value > max(week_high * 3, 25):
        for divisor in (100, 10):
            candidate = value / divisor
            if 0 < candidate <= week_high * 1.5:
                return candidate
    return value


def parse_security_rows(words: list[OCRWord], image_width: int, source: str, as_of: date) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    sector = ""
    for line in cluster_lines(words):
        text = line_text(line)
        n = normalized(text)
        if "NSE ALL SHARE INDEX" in n or "CORPORATE ACTIONS" in n or "UNQUOTED SECURITIES PLATFORM" in n:
            break
        matched_sector = next((s for s in sorted(SECTORS, key=len, reverse=True) if normalized(s) in n), None)
        if matched_sector:
            sector = matched_sector.title().replace("&", "&")
            continue
        if not sector:
            continue

        hi52, hi52_raw = price_from_bucket(line, 0.025, 0.085, image_width)
        lo52, lo52_raw = price_from_bucket(line, 0.085, 0.145, image_width)
        if hi52 is not None:
            lo52 = repair_price(lo52, lo52_raw, hi52)
        isin_words = [w for w in line if 0.35 * image_width <= w.left < 0.43 * image_width]
        if hi52 is None or lo52 is None or not isin_words:
            continue
        isin = clean_isin("".join(w.text for w in isin_words))
        if len(isin) < 9:
            continue

        name_words = [w.text for w in line if 0.14 * image_width <= w.left < 0.35 * image_width]
        security = clean_security(" ".join(name_words))
        if len(security) < 3:
            continue
        status_words = [w.text for w in line if 0.43 * image_width <= w.left < 0.50 * image_width]
        status = " ".join(status_words).strip()

        high, high_raw = price_from_bucket(line, 0.50, 0.60, image_width)
        low, low_raw = price_from_bucket(line, 0.60, 0.68, image_width)
        vwap, vwap_raw = price_from_bucket(line, 0.68, 0.78, image_width)
        previous, previous_raw = price_from_bucket(line, 0.78, 0.86, image_width)
        volume, _ = price_from_bucket(line, 0.86, 0.99, image_width)

        high = repair_price(high, high_raw, hi52)
        low = repair_price(low, low_raw, hi52)
        vwap = repair_price(vwap, vwap_raw, hi52)
        previous = repair_price(previous, previous_raw, hi52)

        change = (vwap - previous) if vwap is not None and previous is not None else None
        change_pct = (change / previous * 100) if change is not None and previous not in (None, 0) else None

        rows.append({
            "Date": as_of.isoformat(), "Sector": sector, "Security": security, "ISIN": isin,
            "Trading Status": status, "52W High": fmt_number(hi52), "52W Low": fmt_number(lo52),
            "High": fmt_number(high), "Low": fmt_number(low), "VWAP": fmt_number(vwap),
            "Previous Price": fmt_number(previous), "Change": fmt_number(change),
            "Change (%)": fmt_number(change_pct), "Volume": str(int(volume)) if volume is not None else "",
            "Source": source,
        })
    return rows


def parse_indices(words: list[OCRWord], source: str, as_of: date) -> list[dict[str, str]]:
    matches: list[tuple[float, float, float]] = []
    pat = re.compile(r"\b(Up|Down)\s+([0-9.,]+)\s+points?\s+to\s+close\s+at\s+([0-9.,]+)", re.I)
    for line in cluster_lines(words):
        text = line_text(line)
        m = pat.search(text)
        if not m:
            continue
        change = parse_num(m.group(2))
        close = parse_num(m.group(3))
        if change is None or close is None:
            continue
        if m.group(1).lower() == "down":
            change = -change
        y = sum(w.center_y for w in line) / len(line)
        matches.append((y, change, close))
    matches.sort()
    if len(matches) < 5:
        raise ValueError(f"found only {len(matches)} of 5 NSE index closes")
    out: list[dict[str, str]] = []
    for name, (_y, change, close) in zip(INDEX_NAMES, matches[:5]):
        previous = close - change
        pct = change / previous * 100 if previous else None
        out.append({
            "Date": as_of.isoformat(), "Index": name, "Close": fmt_number(close, 3),
            "Change": fmt_number(change, 3), "Previous": fmt_number(previous, 3),
            "Change (%)": fmt_number(pct), "Source": source,
        })
    return out


def crop_summary_text(page2: Path, tmpdir: Path) -> str:
    # Crop is expressed as percentages so small template-size changes remain safe.
    # ImageMagick is installed in the Actions workflow specifically for this crop.
    tool = imagemagick_tool()
    w, h = image_dimensions(page2)
    x, y = int(w * 0.70), int(h * 0.27)
    cw, ch = int(w * 0.28), int(h * 0.33)
    crop = tmpdir / "market-summary.png"
    if Path(tool).name == "magick":
        run([tool, str(page2), "-crop", f"{cw}x{ch}+{x}+{y}", "+repage", str(crop)])
    else:
        run([tool, str(page2), "-crop", f"{cw}x{ch}+{x}+{y}", "+repage", str(crop)])
    return run(["tesseract", str(crop), "stdout", "-l", "eng", "--psm", "11"]).stdout


def parse_summary(page2: Path, tmpdir: Path, source: str, as_of: date) -> dict[str, str]:
    text = crop_summary_text(page2, tmpdir)
    nums = []
    for token in re.findall(r"(?<!\w)\d[\d,]*(?:\.\d+)?", text):
        value = parse_num(token)
        if value is not None:
            nums.append(value)
    # Expected sequence: market cap today/previous, shares today/previous,
    # turnover today/previous, total deals today/previous.
    if len(nums) < 8:
        raise ValueError(f"market-summary OCR recovered only {len(nums)} numeric values")
    a = nums[:8]
    return {
        "Date": as_of.isoformat(),
        "Market Capitalization (KES bn)": fmt_number(a[0], 3),
        "Previous Market Capitalization (KES bn)": fmt_number(a[1], 3),
        "Shares Traded": str(int(a[2])), "Previous Shares Traded": str(int(a[3])),
        "Equity Turnover (KES)": str(int(a[4])), "Previous Equity Turnover (KES)": str(int(a[5])),
        "Total Deals": str(int(a[6])), "Previous Total Deals": str(int(a[7])), "Source": source,
    }


def validate_date(words: list[OCRWord], as_of: date) -> None:
    text = " ".join(w.text for w in words if w.top < 350)
    expected_month = as_of.strftime("%B").upper()
    if expected_month not in text.upper() or str(as_of.year) not in text:
        raise ValueError(f"PDF header date does not match expected {as_of.isoformat()}")


def validate_rows(rows: list[dict[str, str]]) -> None:
    if len(rows) < 45:
        raise ValueError(f"only {len(rows)} listed-security rows were extracted")
    sectors = {r["Sector"].upper() for r in rows}
    for required in ("BANKING", "TELECOMMUNICATION"):
        if required not in sectors:
            raise ValueError(f"required sector missing from parsed PDF: {required}")
    if not any("SAFARICOM" in r["Security"].upper() for r in rows):
        raise ValueError("Safaricom row was not recovered; refusing to update")


def read_existing(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv_atomic(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    tmp.replace(path)


def upsert_by_date(path: Path, fieldnames: list[str], new_rows: list[dict[str, str]], day: date) -> None:
    existing = [r for r in read_existing(path) if (r.get("Date") or "") != day.isoformat()]
    combined = existing + new_rows
    if path == PRICES_FILE:
        combined.sort(key=lambda r: ((r.get("Date") or ""), (r.get("Sector") or ""), (r.get("Security") or "")))
    else:
        combined.sort(key=lambda r: ((r.get("Date") or ""), (r.get("Index") or "")))
    write_csv_atomic(path, fieldnames, combined)


def existing_market_dates() -> set[date]:
    dates: set[date] = set()
    for row in read_existing(SUMMARY_FILE):
        raw = (row.get("Date") or "").strip()
        if not raw:
            continue
        try:
            dates.add(date.fromisoformat(raw))
        except ValueError:
            continue
    return dates


def process_day(as_of: date, *, quiet_missing: bool = False) -> bool:
    local_pdf = bool(os.environ.get("NSE_PDF_PATH", "").strip())
    if as_of.weekday() >= 5 and not local_pdf:
        if not quiet_missing:
            print(f"{as_of.isoformat()} is a weekend; no update needed.")
        return False

    if not local_pdf and as_of in existing_market_dates():
        if not quiet_missing:
            print(f"NSE dashboard already contains {as_of.isoformat()}; no update needed.")
        return False

    body, source = download_pdf(as_of)
    if body is None:
        if not quiet_missing:
            print(f"No NSE Daily Price List found for {as_of.isoformat()}; keeping existing data.")
        return False
    require_pdf(body)

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        pdf = tmpdir / "daily-price-list.pdf"
        pdf.write_bytes(body)
        page1, page2 = extract_page_images(pdf, tmpdir)
        page1_ocr = crop_top(page1, tmpdir, "page1-table", 0.88)
        page2_ocr = crop_top(page2, tmpdir, "page2-market", 0.52)
        words1 = tesseract_words(page1_ocr, 3)
        words2 = tesseract_words(page2_ocr, 3)
        validate_date(words1, as_of)
        prices = parse_security_rows(words1, 2480, source, as_of) + parse_security_rows(words2, 2480, source, as_of)
        # Use actual detected width when OCR coordinates show a different render size.
        if words1:
            inferred_width = max(w.left + w.width for w in words1)
            if inferred_width > 1500 and not (45 <= len(prices) <= 120):
                prices = parse_security_rows(words1, inferred_width, source, as_of) + parse_security_rows(words2, inferred_width, source, as_of)
        validate_rows(prices)
        indices = parse_indices(words2, source, as_of)
        summary = parse_summary(page2, tmpdir, source, as_of)

    # Do not touch any dataset until every component has passed validation.
    upsert_by_date(PRICES_FILE, PRICE_FIELDS, prices, as_of)
    upsert_by_date(INDICES_FILE, INDEX_FIELDS, indices, as_of)
    upsert_by_date(SUMMARY_FILE, SUMMARY_FIELDS, [summary], as_of)
    print(f"NSE dashboard updated for {as_of.isoformat()}: {len(prices)} securities, {len(indices)} indices.")
    return True


def ensure_history(anchor: date, minimum_dates: int) -> tuple[int, int]:
    if minimum_dates <= 1 or os.environ.get("NSE_PDF_PATH", "").strip():
        return 0, len(existing_market_dates())

    dates = existing_market_dates()
    if len(dates) >= minimum_dates:
        return 0, len(dates)

    added = 0
    cursor = anchor
    # Forty-five calendar days normally contains well over 22 NSE trading days.
    # Missing files and holidays are skipped; malformed historical PDFs are logged
    # and skipped without touching the already-valid history.
    floor = anchor - timedelta(days=45)
    while len(dates) < minimum_dates and cursor > floor:
        cursor -= timedelta(days=1)
        if cursor.weekday() >= 5 or cursor in dates:
            continue
        try:
            if process_day(cursor, quiet_missing=True):
                dates.add(cursor)
                added += 1
        except Exception as exc:
            print(f"Backfill skipped {cursor.isoformat()}: {exc}", file=sys.stderr)

    if len(dates) < minimum_dates:
        raise RuntimeError(
            f"NSE history backfill reached {len(dates)} trading dates; "
            f"target was {minimum_dates}."
        )
    return added, len(dates)


def main() -> int:
    override = os.environ.get("NSE_DATE", "").strip()
    as_of = date.fromisoformat(override) if override else datetime.now().astimezone().date()
    raw_minimum = os.environ.get("NSE_MIN_HISTORY_DAYS", "1").strip() or "1"
    try:
        minimum_dates = max(1, int(raw_minimum))
    except ValueError as exc:
        raise ValueError("NSE_MIN_HISTORY_DAYS must be a whole number") from exc

    updated = process_day(as_of)
    backfilled, total_dates = ensure_history(as_of, minimum_dates)

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY", "").strip()
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as f:
            f.write("## NSE market dashboard update\n\n")
            f.write(f"- Requested market date: **{as_of.isoformat()}**\n")
            f.write(f"- Latest date processed this run: **{'yes' if updated else 'no'}**\n")
            f.write(f"- Historical dates added: **{backfilled}**\n")
            f.write(f"- Total trading dates stored: **{total_dates}**\n")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
