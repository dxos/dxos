---
'@dxos/react-ui-debug': patch
---

The debug Logger now persists per-file log level overrides across reloads (via a `local`-backed react-ui-attention view-state aspect instead of component-local state) and shows the full repo-relative source path — as a `file` key in the expanded row's JSON, and as the row tooltip — while the row column keeps showing just the basename.
