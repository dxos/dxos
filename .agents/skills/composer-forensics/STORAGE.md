# Composer profile storage on disk

Implementation details of Chromium and wa-sqlite; may change between Chrome versions.

## Chrome user data (macOS)

| Channel       | Base path                                            |
| ------------- | ---------------------------------------------------- |
| Chrome        | `~/Library/Application Support/Google/Chrome`        |
| Chrome Beta   | `~/Library/Application Support/Google/Chrome Beta`   |
| Chrome Canary | `~/Library/Application Support/Google/Chrome Canary` |

Profile directory: `<base>/Default/` (or `Profile 1`, etc.).

## OPFS layout

```
<profile>/File System/
├── Origins/           # LevelDB: ORIGIN:https_<host>_0 → numeric dir ID
├── <ID>/t/            # "temporary" sandbox FS = OPFS for that origin
│   ├── Paths/         # LevelDB: virtual path → pool blob name
│   └── 00/            # Pool blobs (00000006, …)
└── …
```

Origins are encoded like IndexedDB: `https://main.composer.space` → `ORIGIN:https_main.composer.space_0`.

**There is no folder named after the hostname.** Resolve the numeric `<ID>` via `scripts/locate-origin.py` or by parsing `File System/Origins/000003.log`.

## AccessHandlePoolVFS blob format

From `@dxos/wa-sqlite` `AccessHandlePoolVFS.js`:

| Offset   | Size | Content                                                     |
| -------- | ---- | ----------------------------------------------------------- |
| 0        | 512  | UTF-8 path, null-terminated (e.g. `/DXOS`, `/DXOS-journal`) |
| 512      | 4    | SQLite open flags                                           |
| 516      | 8    | Digest                                                      |
| **4096** | rest | **SQLite (or journal) payload**                             |

Verify main DB:

```bash
xxd -s 4096 -l 16 "$BLOB"   # expect: SQLite format 3
```

Composer OPFS subdirectory: worker opens VFS at `opfs/` under the origin OPFS root. Chrome flat pool files live in `t/00/` (not human-readable names).

## IndexedDB (same origin, separate from OPFS)

```
<profile>/IndexedDB/https_main.composer.space_0.indexeddb.leveldb
<profile>/IndexedDB/https_main.composer.space_0.indexeddb.blob
```

Useful to confirm the origin exists even when OPFS mapping is unclear.

## Known Composer origins

| Origin                                    | Typical use                  |
| ----------------------------------------- | ---------------------------- |
| `https://main.composer.space`             | Production                   |
| `https://labs.composer.space`             | Labs                         |
| `https://<branch>.composer-app.pages.dev` | PR previews                  |
| `http://localhost:5173`                   | Local dev (profile-specific) |

Each origin has **isolated** OPFS and IndexedDB.

## Finding blobs by content (fallback)

```bash
find ~/Library/Application\ Support/Google/Chrome/Default/File\ System \
  -type f -exec grep -l "unique-string-in-db" {} \;
```

Slow and fragile; prefer origin → directory ID mapping.
