# Composer forensics — session memory

Append a dated section per session (newest first): `## YYYY-MM-DD — <origin>` + terse bullets. Promote durable rules into `SKILL.md` or `STORAGE.md`.

---

## 2026-06-07 — main.composer.space (skill bootstrap)

- Chrome default profile on macOS: `https://main.composer.space` → `File System/118/t/00/` (origin key `https_main.composer.space_0` in `Origins/000003.log`).
- Main DB blob `00000006` (`/DXOS` header) → strip 4096 bytes → valid `DXOS.sqlite` (~119 MB). Journal: `00000011` (`/DXOS-journal`).
- `AccessHandlePoolVFS` header: path at offset 0, SQLite payload at offset 4096 (`@dxos/wa-sqlite`).
- Worker DB name is `DXOS` (`worker-runtime.ts`); OPFS VFS mounts at `opfs/` subdir inside origin OPFS root.
- Extraction scripts live in `.agents/skills/composer-forensics/scripts/`.
