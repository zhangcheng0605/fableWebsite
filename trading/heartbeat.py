#!/usr/bin/env python3
"""Desk heartbeat — ask both Alpaca paper accounts how they are doing and append
one JSON line to trading/data/ledger.jsonl.

trading/index.html renders its scoreboard from the newest line of that file and
shows a green / amber / red badge depending on how old it is, so the page stays
honest whether the bots are alive or dead.  Run nightly by
.github/workflows/heartbeat.yml; stdlib only, no build step.

Line schema (keys are stable — the page reads them by name):
  ts             ISO-8601 UTC, e.g. 2026-07-17T21:20:00Z
  stock_equity   equity of the stock paper account, USD
  crypto_equity  equity of the crypto paper account, USD
  day_pl         (equity - last_equity) summed over both accounts, USD
  open_positions number of open positions across both accounts
  positions      [{acct, symbol, qty, unrealized_pl}, ...]
  source         "alpaca" for lines this script wrote,
                 "page-snapshot" for the hand-transcribed seed line

Exit status is always 0: missing credentials or an unreachable Alpaca must not
turn the workflow red — the page already knows how to say "stale".
"""
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

BASE = "https://paper-api.alpaca.markets"
LEDGER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "ledger.jsonl")
ACCOUNTS = (
    ("stock", "ALPACA_STOCK_KEY", "ALPACA_STOCK_SECRET"),
    ("crypto", "ALPACA_CRYPTO_KEY", "ALPACA_CRYPTO_SECRET"),
)


def get(path, key, secret):
    req = urllib.request.Request(
        BASE + path,
        headers={
            "APCA-API-KEY-ID": key,
            "APCA-API-SECRET-KEY": secret,
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def main():
    creds = {}
    for name, key_var, secret_var in ACCOUNTS:
        key = os.environ.get(key_var, "").strip()
        secret = os.environ.get(secret_var, "").strip()
        if not key or not secret:
            print("no credentials — skipping")
            return 0
        creds[name] = (key, secret)

    equity = {}
    day_pl = 0.0
    positions = []
    try:
        for name, (key, secret) in creds.items():
            acct = get("/v2/account", key, secret)
            eq = float(acct["equity"])
            last = float(acct.get("last_equity") or eq)
            equity[name] = round(eq, 2)
            day_pl += eq - last
            for p in get("/v2/positions", key, secret):
                positions.append({
                    "acct": name,
                    "symbol": p.get("symbol"),
                    "qty": float(p.get("qty") or 0),
                    "unrealized_pl": round(float(p.get("unrealized_pl") or 0), 2),
                })
    except (urllib.error.URLError, OSError, ValueError, KeyError, TypeError) as err:
        # Alpaca down, DNS, bad JSON, missing field — say so and leave the ledger alone.
        print(f"heartbeat: could not read Alpaca ({type(err).__name__}: {err}) — no line written")
        return 0

    line = {
        "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "stock_equity": equity["stock"],
        "crypto_equity": equity["crypto"],
        "day_pl": round(day_pl, 2),
        "open_positions": len(positions),
        "positions": positions,
        "source": "alpaca",
    }

    # Keep one record per line even if the file was last saved without a trailing newline.
    prefix = ""
    if os.path.exists(LEDGER) and os.path.getsize(LEDGER):
        with open(LEDGER, "rb") as f:
            f.seek(-1, os.SEEK_END)
            if f.read(1) != b"\n":
                prefix = "\n"
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(prefix + json.dumps(line, separators=(",", ":")) + "\n")
    print(
        f"heartbeat: {line['ts']} stock ${line['stock_equity']:,.2f} · "
        f"crypto ${line['crypto_equity']:,.2f} · day P&L {line['day_pl']:+,.2f} · "
        f"{line['open_positions']} open positions → {os.path.relpath(LEDGER)}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
