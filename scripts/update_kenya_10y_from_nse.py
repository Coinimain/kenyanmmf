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

BOND_RE = re.compile(r"\b(FXD\d*)/(\d{4})/(\d{1,3}(?:\.\d+)?)(?:YR)?\b", re.I)
NUMBER_RE = re.compile(r"(?<![\d.])(\d{1,3}(?:\.\d{1,6})?)(?:\s*%)?")
DECIMAL_RE = re.compile(r"(?<![\d.])(\d{1,3}\.\d{2,6})(?!\d)")
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


def pdf_to_text(pdf_bytes: bytes) -> str:
    with tempfile.TemporaryDirectory() as tmp:
        pdf_path = Path(tmp) / "bond-prices.pdf"
        txt_path = Path(tmp) / "bond-prices.txt"
        pdf_path.write_bytes(pdf_bytes)
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


def traded_row_yield(line: str) -> float | None:
    """Extract YTM from an NSE traded FXD row without depending on PDF header text.

    NSE rows are structured as: ... Fixed <coupon> <yield> <dirty price>
    <clean price> <previous price> <value traded>. Untraded rows normally contain
    only the coupon and previous price after ``Fixed``. This is more reliable than
    locating the word ``Yield`` because some NSE PDFs do not expose their table
    headers cleanly through pdftotext.
    """
    fixed = re.search(r"\bFixed\b", line, re.I)
    if not fixed:
        return None

    decimals: list[float] = []
    for match in DECIMAL_RE.finditer(line[fixed.end():]):
        try:
            decimals.append(float(match.group(1)))
        except ValueError:
            pass

    # A traded row needs coupon + yield + dirty price + clean price at minimum.
    # An untraded row generally has coupon + previous price only.
    if len(decimals) < 4:
        return None

    coupon, ytm, dirty, clean = decimals[:4]
    if not (0.0 < coupon < 30.0):
        return None
    if not (5.0 <= ytm <= 25.0):
        return None
    if not (30.0 <= dirty <= 250.0 and 30.0 <= clean <= 250.0):
        return None
    return ytm


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
    lines = text.splitlines()
    as_of_year = decimal_year(as_of)
    observations: list[Observation] = []

    for line in lines:
        match = BOND_RE.search(line)
        if not match:
            continue

        code = match.group(0).upper()
        issue_year = int(match.group(2))
        original_tenor = float(match.group(3))
        ytm = traded_row_yield(line)
        if ytm is None:
            continue

        maturity_date = explicit_maturity_date(line)
        if maturity_date is not None:
            remaining = (maturity_date - as_of).days / 365.2425
        else:
            maturity_year = explicit_maturity_year(line, issue_year)
            if maturity_year is None:
                maturity_year = issue_year + original_tenor
            remaining = maturity_year - as_of_year

        if remaining <= 0 or remaining > 40:
            continue
        observations.append(Observation(code, remaining, ytm))

    if not observations:
        raise ValueError(
            "no usable traded FXD bond rows were found; NSE PDF was downloaded "
            "but no row matched the expected Fixed/coupon/yield/price structure"
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
            text = pdf_to_text(pdf)
            observations = parse_observations(text, wed)
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
