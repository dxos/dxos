---
'@dxos/ui-editor': patch
---

Render bare URLs and `<url>` autolinks as clickable links in markdown (previously only `[label](url)` was decorated), so links in assistant chat messages can be followed instead of copy-pasted. `@dxos/observability` now reaches `SpaceState`/`DeviceKind` through `@dxos/protocols` rather than the `@dxos/client` barrels, keeping echo-client out of a consuming app's eager boot graph.
