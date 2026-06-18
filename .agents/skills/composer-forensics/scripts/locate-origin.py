#!/usr/bin/env python3
"""Map a Composer origin to Chrome's OPFS File System directory ID."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

DEFAULT_CHROME_PROFILE = Path.home() / "Library/Application Support/Google/Chrome/Default"


def origin_to_key(origin: str) -> str:
    origin = origin.rstrip("/")
    if not origin.startswith("http"):
        origin = f"https://{origin}"
    # https://main.composer.space → https_main.composer.space_0
    return origin.replace("://", "_").replace("/", "_") + "_0"


def find_opfs_dir(profile: Path, origin_key: str) -> str | None:
    origins_log = profile / "File System/Origins/000003.log"
    if not origins_log.is_file():
        return None
    data = origins_log.read_bytes()
    needle = f'"ORIGIN:{origin_key}'.encode()
    idx = data.rfind(needle)
    if idx < 0:
        return None
    chunk = data[idx : idx + 80]
    match = re.search(rb"\x03(\d{3})", chunk)
    return match.group(1).decode() if match else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--origin",
        default="https://main.composer.space",
        help="Origin URL (default: https://main.composer.space)",
    )
    parser.add_argument(
        "--profile",
        type=Path,
        default=DEFAULT_CHROME_PROFILE,
        help="Chrome profile directory",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON")
    args = parser.parse_args()

    origin_key = origin_to_key(args.origin)
    dir_id = find_opfs_dir(args.profile, origin_key)
    if not dir_id:
        print(f"Origin not found: {args.origin} (key={origin_key})", file=sys.stderr)
        return 1

    opfs_pool = args.profile / f"File System/{dir_id}/t/00"
    indexeddb = args.profile / f"IndexedDB/https_{origin_key.replace('https_', '')}.indexeddb.leveldb"

    result = {
        "origin": args.origin if args.origin.startswith("http") else f"https://{args.origin}",
        "origin_key": origin_key,
        "chrome_profile": str(args.profile),
        "file_system_dir_id": dir_id,
        "opfs_pool_dir": str(opfs_pool),
        "indexeddb_dir": str(indexeddb),
        "indexeddb_exists": indexeddb.is_dir(),
        "opfs_pool_exists": opfs_pool.is_dir(),
    }

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        for key, value in result.items():
            print(f"{key}: {value}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
