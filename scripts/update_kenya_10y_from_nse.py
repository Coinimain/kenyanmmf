#!/usr/bin/env python3
"""Update Kenya 10-year government-bond yield data from NSE daily bond PDFs.

The script:
- Finds the latest Wednesday NSE BondPrices_DD-MMM-YYYY.pdf, with prior-Wednesday fallback.
- Extracts traded yields for taxable fixed-coupon Treasury bonds (FXD only).
- Uses the nearest FXD observations below and above 10 years remaining maturity.
- Linearly interpolates a 10-year yield.
- Updates kenya-10y-bond-data.csv and kenya-10y-bond-history.csv.
- Updates the Spearhead Africa Infrastructure row in special-funds-data.csv.

It deliberately fails without writing files when the PDF cannot be parsed confidently.
"""

from __future__ import annotations

import csv
import io
import math
import os
import re
import statistics
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Iterable

BASE_URL = "https://www.nse.co.ke/wp-content/uploads/BondPrices_{stamp}.pdf"
BONDS_PAGE = "https://www.nse.co.ke/bonds-statistics/"
CURRENT_FILE = Path("kenya-10y-bond-data.csv")
HISTORY_FILE = Path("kenya-10y-bond-history.csv")
SPECIAL_FUNDS_FILE = Path("special-funds-data.csv")
TARGET_YEARS = 10.0
SPEARHEAD_SPREAD = 3.0
MAX_WEDNESDAY_FALLBACKS = 5
USER_AGENT = "Mozilla/5.0 (compatible; KenyaMMFCalculator/1.0; +https://kenyammfcalculator.co.ke/)"

# NSE PDFs are inconsistent when converted to text, and OCR may insert spaces
# between letters. Accept FXD, F X D, optional series digits, and tenor suffixes.
BOND_RE = re.compile(
    r"(?<![A-Z0-9])F\s*X\s*D\s*(\d*)\s*/\s*(\d{4})\s*/\s*"
    r"(\d{1,3}(?:\.\d+)?)\s*(?:Y\s*R\s*S?|Y\s*E\s*A\s*R\s*S?)?\b",
    re.I,
)
NUMBER_RE = re.compile(r"(?<![\d.])(\d{1,3}(?:\.\d{1,6})?)(?:\s*%)?")
# Capture a complete decimal token, including comma-grouped large values.  This
# prevents an outstanding amount such as 57,134.55 being misread as 134.55.
DECIMAL_RE = re.compile(r"(?<![\d.])(\d{1,3}(?:,\d{3})*\.\d{2,6}|\d+\.\d{2,6})(?!\d)")
DATE_RE = re.compile(r"\b(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{2,4})\b")
MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10,
    "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}


@dataclass(frozen=True)
class Observation:
    code: str
    remaining_years: float
    yield_pct: float


@dataclass(frozen=True)
class Estimate:
    as_of: date
    yield_pct: float
    source_url: str
    lower: Observation
    upper: Observation


@dataclass(frozen=True)
class OCRWord:
    text: str
    left: int
    top: int
    width: int
    height: int
    confidence: float

    @property
    def right(self) -> int:
        return self.left + self.width

    @property
    def center_y(self) -> float:
        return self.top + self.height / 2


def latest_wednesday(anchor: date) -> date:
    # Monday=0 ... Wednesday=2
    delta = (anchor.weekday() - 2) % 7
    return anchor - timedelta(days=delta)


def candidate_wednesdays(anchor: date) -> Iterable[date]:
    first = latest_wednesday(anchor)
    for i in range(MAX_WEDNESDAY_FALLBACKS):
        yield first - timedelta(days=7 * i)


def nse_url(day: date) -> str:
    stamp = day.strftime("%d-%b-%Y").upper()
    return BASE_URL.format(stamp=stamp)


def download_pdf(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/pdf,*/*;q=0.8",
            "Referer": BONDS_PAGE,
        },
    )
    with urllib.request.urlopen(req, timeout=35) as response:
        body = response.read()
    if not body.startswith(b"%PDF") or len(body) < 5_000:
        raise ValueError("response was not a valid NSE PDF")
    return body


def _pdftotext(pdf_path: Path, txt_path: Path) -> str:
    try:
        subprocess.run(
            ["pdftotext", "-layout", "-nopgbrk", str(pdf_path), str(txt_path)],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("pdftotext is required (install poppler-utils)") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"pdftotext failed: {exc.stderr.strip()}") from exc
    return txt_path.read_text(encoding="utf-8", errors="replace")


def _render_pdf_pages(pdf_path: Path, tmpdir: Path, dpi: int = 360) -> list[Path]:
    """Render the NSE PDF to grayscale PNG pages for positional OCR."""
    prefix = tmpdir / "nse-page"
    try:
        subprocess.run(
            ["pdftoppm", "-r", str(dpi), "-gray", "-png", str(pdf_path), str(prefix)],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("pdftoppm is required (install poppler-utils)") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"pdftoppm failed: {exc.stderr.strip()}") from exc

    pages = sorted(tmpdir.glob("nse-page-*.png"))
    if not pages:
        raise RuntimeError("OCR fallback could not render any PDF pages")
    return pages


def _tesseract_words(page: Path, psm: int) -> list[OCRWord]:
    """Return OCR words with coordinates using Tesseract TSV output."""
    try:
        proc = subprocess.run(
            ["tesseract", str(page), "stdout", "-l", "eng", "--psm", str(psm), "tsv"],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("tesseract is required for NSE OCR fallback") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"tesseract OCR failed on {page.name}: {exc.stderr.strip()}") from exc

    reader = csv.DictReader(io.StringIO(proc.stdout), delimiter="\t")
    words: list[OCRWord] = []
    for row in reader:
        text_value = (row.get("text") or "").strip()
        if not text_value:
            continue
        try:
            conf = float(row.get("conf") or -1)
            left = int(row.get("left") or 0)
            top = int(row.get("top") or 0)
            width = int(row.get("width") or 0)
            height = int(row.get("height") or 0)
        except ValueError:
            continue
        # Keep low-ish confidence numerics because table rules hurt Tesseract's
        # confidence even when the digits themselves are usable.
        if conf < 12 or width <= 0 or height <= 0:
            continue
        words.append(OCRWord(text_value, left, top, width, height, conf))
    return words


def _cluster_visual_lines(words: list[OCRWord]) -> list[list[OCRWord]]:
    """Group OCR words by their visual baseline rather than OCR text flow."""
    if not words:
        return []
    heights = sorted(w.height for w in words if w.height > 0)
    median_height = heights[len(heights) // 2] if heights else 18
    tolerance = max(6.0, min(22.0, median_height * 0.62))

    lines: list[list[OCRWord]] = []
    centers: list[float] = []
    for word in sorted(words, key=lambda w: (w.center_y, w.left)):
        best_idx = None
        best_dist = None
        # Only the last few clusters can plausibly match after sorting by y.
        for idx in range(max(0, len(lines) - 4), len(lines)):
            dist = abs(word.center_y - centers[idx])
            if dist <= tolerance and (best_dist is None or dist < best_dist):
                best_idx = idx
                best_dist = dist
        if best_idx is None:
            lines.append([word])
            centers.append(word.center_y)
        else:
            lines[best_idx].append(word)
            centers[best_idx] = statistics.mean(w.center_y for w in lines[best_idx])

    for line in lines:
        line.sort(key=lambda w: w.left)
    return sorted(lines, key=lambda line: statistics.mean(w.center_y for w in line))


def _line_text(words: list[OCRWord]) -> str:
    return " ".join(w.text for w in words)


def _heading_normalized(text: str) -> str:
    return re.sub(r"[^A-Z0-9]+", " ", text.upper()).strip()


def _looks_like_fixed_heading(text: str) -> bool:
    u = _heading_normalized(text)
    # Live September PDFs OCR "FIXED" as "FKED", so do not require exact spelling.
    return (
        "KENYA" in u
        and "TREASURY" in u
        and "BOND" in u
        and ("FIXED" in u or "FKED" in u or "RATE" in u)
        and "50" in u
        and "BELOW" not in u
    )


def _looks_like_fixed_section_end(text: str) -> bool:
    u = _heading_normalized(text)
    return (
        "INFRASTRUCTURE" in u
        or ("SELL" in u and "BUY" in u and "BACK" in u)
        or ("BELOW" in u and "50" in u and "MILLION" in u)
        or "CORPORATE BONDS" in u
    )


def _merge_close_words(words: list[OCRWord]) -> list[tuple[int, int, str]]:
    """Merge OCR fragments that belong to one printed numeric cell."""
    if not words:
        return []
    heights = sorted(w.height for w in words if w.height > 0)
    median_height = heights[len(heights) // 2] if heights else 18
    max_gap = max(5, int(median_height * 0.42))

    groups: list[list[OCRWord]] = []
    for word in sorted(words, key=lambda w: w.left):
        # Ignore table-border glyphs by themselves.
        if re.fullmatch(r"[|_\[\]{}()]+", word.text):
            continue
        if not groups:
            groups.append([word])
            continue
        prev = groups[-1][-1]
        gap = word.left - prev.right
        # Merge tiny OCR fragments such as "1" + "2.7000", but do not bridge
        # normal table-cell gaps.
        if gap <= max_gap:
            groups[-1].append(word)
        else:
            groups.append([word])

    merged: list[tuple[int, int, str]] = []
    for group in groups:
        merged.append((group[0].left, group[-1].right, "".join(w.text for w in group)))
    return merged


def _parse_ocr_number(token: str) -> float | None:
    """Parse one OCR numeric cell, including common comma/decimal confusion."""
    raw = token.strip()
    # Only apply letter-to-digit substitutions to strings that already look numeric.
    if re.search(r"\d", raw):
        raw = raw.replace("O", "0").replace("o", "0")
        raw = raw.replace("I", "1").replace("l", "1")
    raw = re.sub(r"[^0-9.,-]", "", raw)
    if not raw or raw in {"-", ".", ","}:
        return None

    # OCR often turns the decimal point in rates into a comma: 12,7000.
    if "." not in raw and raw.count(",") == 1:
        left, right = raw.split(",", 1)
        if left.isdigit() and right.isdigit() and len(right) == 4 and int(left) <= 250:
            raw = left + "." + right
        elif left.isdigit() and right.isdigit() and len(right) == 3:
            raw = left + right
    elif raw.count(",") >= 1:
        raw = raw.replace(",", "")

    try:
        return float(raw)
    except ValueError:
        return None


def _numeric_cells(words: list[OCRWord]) -> list[tuple[int, float, str]]:
    cells: list[tuple[int, float, str]] = []
    for left, _right, token in _merge_close_words(words):
        value = _parse_ocr_number(token)
        if value is not None:
            cells.append((left, value, token))
    return cells


def _row_observation_from_words(
    words: list[OCRWord], page_width: int, row_id: str
) -> Observation | None:
    """Parse a traded fixed-rate row from its visual column order.

    We intentionally do not depend on reading the FXD code. The live NSE image PDFs
    OCR codes such as FXD1/2019/15Yr very poorly, while the numeric columns are much
    more reliable. The table itself gives Days to Maturity, Coupon and Traded Yield,
    which are sufficient for the 10-year interpolation.
    """
    cells = _numeric_cells(words)
    if len(cells) < 4:
        return None

    # Locate coupon -> traded yield -> price by value and left-to-right order.
    # Requiring a price after the two rates distinguishes actively traded rows
    # from rows that only show coupon and previous price.
    rate_window: tuple[int, int, float, float] | None = None
    for i, (x1, coupon, _t1) in enumerate(cells):
        if not (5.0 <= coupon <= 25.0) or x1 < page_width * 0.42:
            continue
        for j in range(i + 1, min(len(cells), i + 4)):
            x2, traded_yield, _t2 = cells[j]
            if not (5.0 <= traded_yield <= 25.0):
                continue
            if x2 <= x1:
                continue
            price_found = any(
                x3 > x2 and 45.0 <= price <= 250.0
                for x3, price, _t3 in cells[j + 1 : j + 5]
            )
            if price_found:
                rate_window = (x1, x2, coupon, traded_yield)
                break
        if rate_window is not None:
            break
    if rate_window is None:
        return None

    coupon_x, _yield_x, _coupon, traded_yield = rate_window

    # Days to Maturity is the last moderate-sized integer before the coupon columns.
    # Exclude four-digit calendar years; outstanding values are generally far above
    # this range and therefore drop out naturally.
    # If the outstanding-value cell OCRs cleanly, use its position as a hard
    # right boundary for Days to Maturity. This prevents a small outstanding
    # balance such as 9,500.00 from being mistaken for 9,500 days.
    outstanding_x_candidates = [
        x
        for x, value, token in cells
        if x < coupon_x
        and x > page_width * 0.25
        and value > 250.0
        and "." in token
    ]
    outstanding_x = max(outstanding_x_candidates) if outstanding_x_candidates else None

    day_candidates: list[tuple[int, int]] = []
    for x, value, token in cells:
        if x >= coupon_x or x < page_width * 0.18:
            continue
        if outstanding_x is not None and x >= outstanding_x:
            continue
        if outstanding_x is None and x > page_width * 0.49:
            continue
        rounded = int(round(value))
        if abs(value - rounded) > 0.001:
            continue
        if not (30 <= rounded <= 15000):
            continue
        if 2000 <= rounded <= 2099:
            continue
        # Ignore very large comma-grouped transaction values.
        if token.count(",") >= 2:
            continue
        day_candidates.append((x, rounded))
    if not day_candidates:
        return None

    days = max(day_candidates, key=lambda item: item[0])[1]
    remaining = days / 365.2425
    if not (0.08 <= remaining <= 40.0):
        return None

    text = _line_text(words)
    # Best-effort label for logs only. It is not used to decide whether the row is FXD.
    issue_match = re.search(r"[A-Za-z0-9]{2,8}[\/|][A-Za-z0-9\/|.%_-]{4,25}", text)
    code = issue_match.group(0).upper() if issue_match else f"NSE-FXD-{row_id}-{days}D"
    return Observation(code=code, remaining_years=remaining, yield_pct=traded_yield)


def _ocr_positional_observations(
    pdf_path: Path, tmpdir: Path, as_of: date
) -> list[Observation]:
    """Extract traded FXD rows from the NSE image PDF.

    The NSE PDF is an image-only document.  Tesseract's automatic page layout
    modes (PSM 3/4) read the original embedded page image much more accurately
    than sparse/row OCR because they preserve the very wide table structure.
    We therefore extract page 1's source image with ``pdfimages`` and OCR only
    that image.  The taxable fixed-rate section we need appears on page 1 above
    the ``INFRASTRUCTURE BONDS`` heading.
    """

    prefix = tmpdir / "nse-source"
    try:
        subprocess.run(
            ["pdfimages", "-f", "1", "-l", "1", "-png", str(pdf_path), str(prefix)],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("pdfimages is required (install poppler-utils)") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"pdfimages failed: {exc.stderr.strip()}") from exc

    images = sorted(tmpdir.glob("nse-source-*.png"))
    if not images:
        raise RuntimeError("OCR fallback could not extract the first NSE page image")

    # The live NSE PDFs currently contain one full-page image per PDF page. If
    # that ever changes, the full-page table will still be the largest image.
    page_image = max(images, key=lambda p: p.stat().st_size)

    def ocr_text(psm: int) -> str:
        try:
            proc = subprocess.run(
                ["tesseract", str(page_image), "stdout", "-l", "eng", "--psm", str(psm)],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
        except FileNotFoundError as exc:
            raise RuntimeError("tesseract is required for NSE OCR fallback") from exc
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(
                f"tesseract OCR failed on {page_image.name}: {exc.stderr.strip()}"
            ) from exc
        return proc.stdout

    def ocr_decimal_values(text: str) -> list[float]:
        # Rates/prices normally use a period, but OCR occasionally substitutes
        # a comma (for example 13,9420).  Thousands-separated values have exactly
        # three digits after a comma and are therefore kept distinct.
        values: list[float] = []
        pattern = re.compile(
            r"(?<![\d.,])(?:\d{1,3}(?:,\d{3})*\.\d{2,6}|\d+\.\d{2,6}|\d{1,3},\d{4,6})(?!\d)"
        )
        for match in pattern.finditer(text):
            raw = match.group(0)
            if "." not in raw and raw.count(",") == 1:
                left, right = raw.split(",", 1)
                if len(right) >= 4:
                    raw = left + "." + right
            else:
                raw = raw.replace(",", "")
            try:
                values.append(float(raw))
            except ValueError:
                continue
        return values

    # Printed Days-to-Maturity followed by Outstanding Value (in millions).
    # We primarily use the OCR'd maturity date for remaining tenor because it
    # corrects occasional digit mistakes in the printed days cell (e.g. 3,057
    # being OCR'd as 3,087).  The days cell remains a fallback.
    days_outstanding_re = re.compile(
        r"(?<!\d)(\d[\d,]{1,6})\s+(\d{1,3}(?:,\d{3})*\.\d{2})(?!\d)"
    )

    for psm in (3, 4):
        text = ocr_text(psm)
        lines = text.splitlines()

        start_idx: int | None = None
        end_idx: int | None = None
        for idx, line in enumerate(lines):
            u = _heading_normalized(line)
            if start_idx is None:
                if (
                    "KENYA" in u
                    and "TREASURY" in u
                    and "BONDS" in u
                    and "ABOVE" in u
                    and "50" in u
                ):
                    start_idx = idx + 1
                continue
            if "INFRASTRUCTURE" in u and "BOND" in u:
                end_idx = idx
                break
            if "BELOW" in u and "50" in u and "MILLION" in u:
                end_idx = idx
                break

        if start_idx is None:
            print(f"Image OCR (psm {psm}) could not find the fixed-rate section heading.")
            continue
        if end_idx is None:
            end_idx = len(lines)

        raw_rows: list[tuple[int, Observation]] = []
        diagnostics: list[str] = []
        for row_no, line in enumerate(lines[start_idx:end_idx], start=start_idx + 1):
            # The issue code itself can OCR as FXD1/... or FxD1/... and "Yr" may
            # become "¥r".  It is only a label; the numeric row structure decides
            # whether a trade is usable.
            if "FXD" not in line.upper().replace(" ", ""):
                continue

            pair_matches = list(days_outstanding_re.finditer(line))
            if not pair_matches:
                continue
            pair = pair_matches[-1]

            try:
                printed_days = int(pair.group(1).replace(",", ""))
            except ValueError:
                continue

            values = ocr_decimal_values(line[pair.end():])
            ytm = _yield_from_values(values)
            if ytm is None:
                continue

            maturity = explicit_maturity_date(line)
            if maturity is not None:
                remaining_days = (maturity - as_of).days
            else:
                remaining_days = printed_days

            if not (30 <= remaining_days <= 15000):
                continue
            remaining_years = remaining_days / 365.2425

            first = line.strip().split()[0] if line.strip() else ""
            code = first.upper().replace("¥", "Y")
            if not code.startswith("FXD"):
                code = f"NSE-FXD-{remaining_days}D"

            obs = Observation(code, remaining_years, ytm)
            raw_rows.append((remaining_days, obs))
            if len(diagnostics) < 10:
                diagnostics.append(
                    f"{code}: {remaining_days}d ({remaining_years:.2f}y) @ {ytm:.4f}%"
                )

        if raw_rows:
            # One bond can trade several times on the same day. Collapse by
            # maturity (not OCR'd security code) so minor OCR differences in the
            # issue label cannot create duplicate curve points.
            grouped: dict[int, list[Observation]] = {}
            for remaining_days, obs in raw_rows:
                grouped.setdefault(remaining_days, []).append(obs)

            observations: list[Observation] = []
            for remaining_days, rows in grouped.items():
                observations.append(
                    Observation(
                        code=rows[0].code,
                        remaining_years=remaining_days / 365.2425,
                        yield_pct=statistics.median(r.yield_pct for r in rows),
                    )
                )
            observations.sort(key=lambda o: o.remaining_years)

            print(
                f"Image OCR (psm {psm}) recovered {len(raw_rows)} traded rows "
                f"across {len(observations)} fixed-rate Treasury maturities."
            )
            for row in diagnostics:
                print(f"  OCR row: {row}")
            return observations

        print(
            f"Image OCR (psm {psm}) found the fixed-rate section but no usable traded rows."
        )

    raise ValueError("image OCR found no usable traded fixed-rate Treasury rows")

def pdf_to_text(pdf_bytes: bytes) -> str:
    """Extract embedded PDF text only. Image-only PDFs return an empty string."""
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        pdf_path = tmpdir / "bond-prices.pdf"
        txt_path = tmpdir / "bond-prices.txt"
        pdf_path.write_bytes(pdf_bytes)
        return _pdftotext(pdf_path, txt_path)


def observations_from_pdf(pdf_bytes: bytes, as_of: date) -> list[Observation]:
    """Use embedded FXD text when available, otherwise positional OCR."""
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        pdf_path = tmpdir / "bond-prices.pdf"
        txt_path = tmpdir / "bond-prices.txt"
        pdf_path.write_bytes(pdf_bytes)

        embedded = _pdftotext(pdf_path, txt_path)
        embedded_matches = len(list(BOND_RE.finditer(embedded)))
        if embedded_matches:
            print(f"Embedded PDF text contains {embedded_matches} FXD code(s).")
            return parse_observations(embedded, as_of)

        print(
            "Embedded PDF text contains 0 FXD codes; using first-page image OCR."
        )
        return _ocr_positional_observations(pdf_path, tmpdir, as_of)


def decimal_year(day: date) -> float:
    start = date(day.year, 1, 1)
    end = date(day.year + 1, 1, 1)
    return day.year + (day - start).days / (end - start).days


def numeric_tokens(line: str) -> list[tuple[int, float]]:
    out: list[tuple[int, float]] = []
    for match in NUMBER_RE.finditer(line):
        try:
            out.append((match.start(), float(match.group(1))))
        except ValueError:
            pass
    return out


def decimal_values(text: str) -> list[float]:
    values: list[float] = []
    for match in DECIMAL_RE.finditer(text):
        try:
            values.append(float(match.group(1).replace(",", "")))
        except ValueError:
            pass
    return values


def _yield_from_values(values: list[float]) -> float | None:
    # Find coupon, YTM, dirty price and clean price as a consecutive 4-value
    # window.  This also works when pdftotext wraps a visual row over lines.
    for i in range(max(0, len(values) - 3)):
        coupon, ytm, dirty, clean = values[i : i + 4]
        if (
            0.0 < coupon < 30.0
            and 5.0 <= ytm <= 25.0
            and 30.0 <= dirty <= 250.0
            and 30.0 <= clean <= 250.0
        ):
            return ytm
    return None


def traded_row_yield(block: str) -> float | None:
    """Extract YTM from one NSE FXD record.

    NSE rows are visually laid out as coupon, traded yield, dirty price and clean
    price, but pdftotext sometimes wraps those cells onto separate text lines.
    Parse the whole bond block rather than assuming one physical text line.
    """
    fixed = re.search(r"\bFixed\b", block, re.I)
    if fixed:
        ytm = _yield_from_values(decimal_values(block[fixed.end():]))
        if ytm is not None:
            return ytm

    # Fallback: FXD itself means fixed-coupon Treasury bond.  If the word Fixed is
    # lost/reordered in the PDF text layer, scan the record but reject large
    # outstanding-value numbers and require the coupon/YTM/price pattern.
    values = [v for v in decimal_values(block) if v <= 250.0]
    return _yield_from_values(values)


def parse_nse_date(day: str, month: str, year: str) -> date | None:
    month_no = MONTHS.get(month.lower())
    if month_no is None:
        return None
    year_no = int(year)
    if year_no < 100:
        year_no += 2000
    try:
        return date(year_no, month_no, int(day))
    except ValueError:
        return None


def explicit_maturity_date(line: str) -> date | None:
    dates: list[date] = []
    for match in DATE_RE.finditer(line):
        parsed = parse_nse_date(*match.groups())
        if parsed is not None:
            dates.append(parsed)
    # NSE rows print Issue Date then Maturity Date.
    if len(dates) >= 2:
        return dates[1]
    return None


def explicit_maturity_year(line: str, issue_year: int) -> float | None:
    # Fallback for unexpected date formatting.
    years = [int(y) for y in re.findall(r"\b(20\d{2})\b", line)]
    future = [y for y in years if y > issue_year and 2027 <= y <= 2065]
    if not future:
        return None
    return float(max(future))


def parse_observations(text: str, as_of: date) -> list[Observation]:
    as_of_year = decimal_year(as_of)
    observations: list[Observation] = []

    # Treat everything from one FXD code to the next FXD code as one record.
    # This survives NSE PDFs where a single visual table row is emitted by
    # pdftotext as two or more physical lines.
    matches = list(BOND_RE.finditer(text))
    for idx, match in enumerate(matches):
        start = match.start()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else min(len(text), start + 1800)
        block = text[start:end]

        raw_code = match.group(0)
        code = re.sub(r"\s+", "", raw_code).upper()
        issue_year = int(match.group(2))
        original_tenor = float(match.group(3))
        ytm = traded_row_yield(block)
        if ytm is None:
            continue

        maturity_date = explicit_maturity_date(block)
        if maturity_date is not None:
            remaining = (maturity_date - as_of).days / 365.2425
        else:
            maturity_year = explicit_maturity_year(block, issue_year)
            if maturity_year is None:
                maturity_year = issue_year + original_tenor
            remaining = maturity_year - as_of_year

        if remaining <= 0 or remaining > 40:
            continue
        observations.append(Observation(code, remaining, ytm))

    if not observations:
        # Print compact diagnostics in Actions so a future NSE layout change can
        # be diagnosed from the log without downloading artifacts.
        print(f"Diagnostic: found {len(matches)} FXD code(s) in extracted PDF text.")
        for match in matches[:8]:
            start = match.start()
            excerpt = re.sub(r"\s+", " ", text[start : start + 500]).strip()
            print(f"  FXD excerpt: {excerpt[:500]}")
        raise ValueError(
            "no usable traded FXD bond records were found after wrapped-row parsing"
        )

    # NSE PDFs can contain multiple trades for one security. A median traded yield per
    # issue avoids one large or unusual block setting the benchmark point by itself.
    grouped: dict[str, list[Observation]] = {}
    for obs in observations:
        grouped.setdefault(obs.code, []).append(obs)

    collapsed: list[Observation] = []
    for code, rows in grouped.items():
        collapsed.append(
            Observation(
                code=code,
                remaining_years=statistics.median(r.remaining_years for r in rows),
                yield_pct=statistics.median(r.yield_pct for r in rows),
            )
        )
    return sorted(collapsed, key=lambda x: x.remaining_years)


def interpolate_10y(observations: list[Observation]) -> tuple[float, Observation, Observation]:
    lower_candidates = [o for o in observations if o.remaining_years <= TARGET_YEARS]
    upper_candidates = [o for o in observations if o.remaining_years >= TARGET_YEARS]
    if not lower_candidates or not upper_candidates:
        raise ValueError("no FXD bonds bracket 10 years remaining maturity")

    lower = max(lower_candidates, key=lambda o: o.remaining_years)
    upper = min(upper_candidates, key=lambda o: o.remaining_years)

    # Require reasonably local curve points. This prevents interpolation across the
    # entire curve when trading around 10 years is absent on a particular Wednesday.
    if lower.remaining_years < 5.0 or upper.remaining_years > 15.5:
        raise ValueError(
            f"10Y bracket is too wide: {lower.remaining_years:.2f}y to {upper.remaining_years:.2f}y"
        )

    if math.isclose(lower.remaining_years, upper.remaining_years, abs_tol=0.05):
        estimate = statistics.mean([lower.yield_pct, upper.yield_pct])
    else:
        weight = (TARGET_YEARS - lower.remaining_years) / (
            upper.remaining_years - lower.remaining_years
        )
        estimate = lower.yield_pct + weight * (upper.yield_pct - lower.yield_pct)

    if not 7.0 <= estimate <= 20.0:
        raise ValueError(f"interpolated 10Y yield failed sanity check: {estimate:.4f}%")
    return estimate, lower, upper


def load_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader.fieldnames or []), list(reader)


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    tmp.replace(path)


def find_column(fieldnames: list[str], names: set[str]) -> str | None:
    lookup = {f.strip().lower(): f for f in fieldnames}
    for name in names:
        if name in lookup:
            return lookup[name]
    return None


def update_current_file(estimate: Estimate) -> None:
    d = estimate.as_of.isoformat()
    y = f"{estimate.yield_pct:.4f}"

    if CURRENT_FILE.exists():
        fields, _rows = load_csv(CURRENT_FILE)
        date_col = find_column(fields, {"date", "as of", "as_of"})
        yield_col = find_column(fields, {"yield", "yield (%)", "yield_pct", "10y yield", "close"})
        source_col = find_column(fields, {"source", "source url", "source_url"})
        if date_col and yield_col:
            row = {field: "" for field in fields}
            row[date_col] = d
            row[yield_col] = y
            # Preserve compatibility with the old Stooq OHLC format if it is still present.
            for alias in ("Open", "High", "Low", "Close"):
                if alias in row:
                    row[alias] = y
            if source_col:
                row[source_col] = estimate.source_url
            write_csv(CURRENT_FILE, fields, [row])
            return

    write_csv(
        CURRENT_FILE,
        ["Date", "Yield", "Source"],
        [{"Date": d, "Yield": y, "Source": estimate.source_url}],
    )


def update_history_file(estimate: Estimate) -> None:
    d = estimate.as_of.isoformat()
    y = f"{estimate.yield_pct:.4f}"

    if HISTORY_FILE.exists():
        fields, rows = load_csv(HISTORY_FILE)
        date_col = find_column(fields, {"date", "as of", "as_of"})
        yield_col = find_column(fields, {"yield", "yield (%)", "yield_pct", "10y yield", "close"})
        source_col = find_column(fields, {"source", "source url", "source_url"})
        if not date_col or not yield_col:
            raise ValueError(f"unrecognized history CSV schema: {fields}")

        row = {field: "" for field in fields}
        row[date_col] = d
        row[yield_col] = y
        for alias in ("Open", "High", "Low", "Close"):
            if alias in row:
                row[alias] = y
        if source_col:
            row[source_col] = estimate.source_url

        replaced = False
        for idx, old in enumerate(rows):
            if old.get(date_col, "").strip() == d:
                rows[idx] = row
                replaced = True
                break
        if not replaced:
            rows.append(row)
        rows.sort(key=lambda r: r.get(date_col, ""))
        write_csv(HISTORY_FILE, fields, rows)
        return

    write_csv(
        HISTORY_FILE,
        ["Date", "Yield", "Source"],
        [{"Date": d, "Yield": y, "Source": estimate.source_url}],
    )


def human_date(day: date) -> str:
    return f"{day.day} {day.strftime('%b %Y')}"


def display_rate(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".")


def update_spearhead(estimate: Estimate) -> None:
    if not SPECIAL_FUNDS_FILE.exists():
        print(f"Note: {SPECIAL_FUNDS_FILE} not present; skipping Spearhead CSV update.")
        return

    fields, rows = load_csv(SPECIAL_FUNDS_FILE)
    required = {
        "Fund ID",
        "Projection Rate (%)",
        "Rate Period",
        "Last Updated",
        "Performance Source",
    }
    missing = required.difference(fields)
    if missing:
        raise ValueError(f"special-funds-data.csv missing columns: {sorted(missing)}")

    found = False
    for row in rows:
        if row.get("Fund ID", "").strip() == "spearhead-africa-infrastructure":
            row["Projection Rate (%)"] = display_rate(estimate.yield_pct + SPEARHEAD_SPREAD)
            row["Rate Period"] = human_date(estimate.as_of)
            row["Last Updated"] = estimate.as_of.isoformat()
            row["Performance Source"] = estimate.source_url
            found = True
            break
    if not found:
        raise ValueError("Spearhead row not found in special-funds-data.csv")
    write_csv(SPECIAL_FUNDS_FILE, fields, rows)


def get_estimate(anchor: date) -> Estimate:
    errors: list[str] = []
    for wed in candidate_wednesdays(anchor):
        url = nse_url(wed)
        print(f"Trying {url}")
        try:
            pdf = download_pdf(url)
            observations = observations_from_pdf(pdf, wed)
            estimate, lower, upper = interpolate_10y(observations)
            return Estimate(wed, estimate, url, lower, upper)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError, RuntimeError) as exc:
            errors.append(f"{wed.isoformat()}: {exc}")
            print(f"  skipped: {exc}")
    raise RuntimeError("No usable NSE Wednesday bond-price PDF found. " + " | ".join(errors))


def main() -> int:
    override = os.environ.get("NSE_ANCHOR_DATE", "").strip()
    anchor = date.fromisoformat(override) if override else datetime.now().astimezone().date()
    estimate = get_estimate(anchor)

    print(
        f"10Y estimate {estimate.as_of.isoformat()}: {estimate.yield_pct:.4f}% "
        f"from {estimate.lower.code} ({estimate.lower.remaining_years:.2f}y, {estimate.lower.yield_pct:.4f}%) "
        f"and {estimate.upper.code} ({estimate.upper.remaining_years:.2f}y, {estimate.upper.yield_pct:.4f}%)."
    )

    update_current_file(estimate)
    update_history_file(estimate)
    update_spearhead(estimate)

    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write("## Kenya 10-year bond update\n\n")
            f.write(f"- NSE date: **{estimate.as_of.isoformat()}**\n")
            f.write(f"- Interpolated 10Y yield: **{estimate.yield_pct:.4f}%**\n")
            f.write(
                f"- Lower point: `{estimate.lower.code}` — {estimate.lower.remaining_years:.2f}y, "
                f"{estimate.lower.yield_pct:.4f}%\n"
            )
            f.write(
                f"- Upper point: `{estimate.upper.code}` — {estimate.upper.remaining_years:.2f}y, "
                f"{estimate.upper.yield_pct:.4f}%\n"
            )
            f.write(f"- Spearhead target: **{estimate.yield_pct + SPEARHEAD_SPREAD:.2f}%**\n")
            f.write(f"- Source: {estimate.source_url}\n")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
