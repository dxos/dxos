# Composer forensics — session memory

Append a dated section per session (newest first): `## YYYY-MM-DD — <origin>` + terse bullets. Promote durable rules into `SKILL.md` or `STORAGE.md`.

---

## 2026-06-07 — main.composer.space (skill bootstrap)

- Chrome default profile on macOS: `https://main.composer.space` → `File System/118/t/00/` (origin key `https_main.composer.space_0` in `Origins/000003.log`).
- Main DB blob `00000006` (`/DXOS` header) → strip 4096 bytes → valid `DXOS.sqlite` (~119 MB). Journal: `00000011` (`/DXOS-journal`).
- `AccessHandlePoolVFS` header: path at offset 0, SQLite payload at offset 4096 (`@dxos/wa-sqlite`).
- Worker DB name is `DXOS` (`worker-runtime.ts`); OPFS VFS mounts at `opfs/` subdir inside origin OPFS root.
- Probe modules live in `scripts/src/` (not `lib/` — repo root `.gitignore` ignores `lib`).
- `automerge list-ids` lists classic automerge docs; subduction storage keys (`subduction-*`) are excluded from totals.
- Largest classic doc on 2026-06-07 extract: `2DWmBh837zCBGPFZheCWBH1KFMRL` (14.2 MiB binary, 90 KiB JSON → **161x** ratio, 4 chunks, ~15s loadIncremental, 32M ops / 3149 changes).
- **Root cause (2026-06-07):** 96% of ops are `set`; median ~10k ops/change. Reified doc is 1 Mailbox with TagIndex (`tags` map, 3143 ids). DXOS `TagIndex.setTag` replaces whole arrays via spread — quadratic history growth.
- `automerge-inspect.js --mutations` decodes changes for op breakdown; `automerge-escalate.js` writes `.bin` + `-report.md` for Automerge maintainers.
- Full command docs: `COMMANDS.md`.
- Linear issue draft: `LINEAR-tagindex-write-amplification.md`.
- Composer `/recovery.html`: minimal safe mode (export OPFS SQLite, reset, boot minimal client, debug port on :9321).
- Recovery debug: browser opens Debug Port first (polls with retry) → `composer-recovery.js '<snippet>'` one-shot (stdout JSON, exits). `--interactive` for REPL. HTTPS needs `COMPOSER_RECOVERY_HTTPS=1` + mkcert.
- Boot loader excluded from `recovery.html` (only `index.html`).
