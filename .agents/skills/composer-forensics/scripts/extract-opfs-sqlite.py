#!/usr/bin/env python3
"""Extract DXOS SQLite files from Chrome OPFS AccessHandlePoolVFS blobs."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

HEADER_MAX_PATH_SIZE = 512
HEADER_OFFSET_DATA = 4096
SQLITE_MAGIC = b"SQLite format 3\x00"


def read_associated_path(filepath: Path) -> str:
    with filepath.open("rb") as handle:
        corpus = handle.read(HEADER_MAX_PATH_SIZE)
    nul = corpus.find(b"\x00")
    if nul <= 0:
        return ""
    return corpus[:nul].decode("utf-8", errors="replace")


def strip_header(src: Path, dst: Path) -> int:
    size = src.stat().st_size
    payload_size = max(0, size - HEADER_OFFSET_DATA)
    with src.open("rb") as fin, dst.open("wb") as fout:
        fin.seek(HEADER_OFFSET_DATA)
        remaining = payload_size
        while remaining > 0:
            chunk = fin.read(min(remaining, 1024 * 1024))
            if not chunk:
                break
            fout.write(chunk)
            remaining -= len(chunk)
    return payload_size


def friendly_name(path: str, blob_name: str) -> str:
    if not path:
        return f"unassociated-{blob_name}.bin"
    slug = path.strip("/").replace("/", "_")
    if "journal" in slug.lower():
        return f"{slug}.bin"
    return f"{slug}.sqlite"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--opfs-dir",
        type=Path,
        required=True,
        help="Path to File System/<ID>/t/00",
    )
    parser.add_argument(
        "--out",
        type=Path,
        required=True,
        help="Output directory",
    )
    args = parser.parse_args()

    if not args.opfs_dir.is_dir():
        print(f"OPFS pool dir not found: {args.opfs_dir}", file=sys.stderr)
        return 1

    args.out.mkdir(parents=True, exist_ok=True)
    raw_dir = args.out / "raw-opfs-blobs"
    raw_dir.mkdir(exist_ok=True)

    extracted: list[dict] = []
    for blob in sorted(args.opfs_dir.iterdir()):
        if not blob.is_file():
            continue

        import shutil

        shutil.copy2(blob, raw_dir / blob.name)

        path = read_associated_path(blob)
        out_name = friendly_name(path, blob.name)
        out_path = args.out / out_name
        payload_size = strip_header(blob, out_path)

        magic = b""
        if payload_size > 0:
            with out_path.open("rb") as handle:
                magic = handle.read(16)

        entry = {
            "blob": blob.name,
            "associated_path": path,
            "payload_bytes": payload_size,
            "output": out_name,
            "sqlite": magic == SQLITE_MAGIC,
        }
        extracted.append(entry)
        status = "sqlite" if entry["sqlite"] else ("empty" if payload_size == 0 else "binary")
        print(f"{blob.name}: {path or '(unassociated)'} -> {out_name} ({payload_size:,} bytes, {status})")

    manifest = {
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "opfs_pool_dir": str(args.opfs_dir),
        "files": extracted,
    }
    manifest_path = args.out / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"\nWrote manifest: {manifest_path}")

    main_db = args.out / "DXOS.sqlite"
    if not main_db.is_file():
        print("Warning: DXOS.sqlite not found in output", file=sys.stderr)
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
