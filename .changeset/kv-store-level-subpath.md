---
'@dxos/echo': minor
---

`createLevel` moves from `@dxos/kv-store` to `@dxos/kv-store/level`, so importing the package for its types no longer binds LevelDB's native addon. The `LevelDB`, `SublevelDB` and `BatchLevel` types are unchanged on the main entry.
