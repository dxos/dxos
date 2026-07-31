---
'@dxos/react-ui': minor
---

Runtime icon resolver: `ThemeProvider` mounts an `IconRegistry` that ingests the static `/icons.svg` sprite into an in-DOM defs container and resolves missing Phosphor icons on demand from `/phosphor/{weight}/{name}.svg`, so icons referenced only by runtime-loaded plugins render without being present in the build-time sprite. `useIconHref` now returns a same-document `#name` href (or `undefined` while unresolved), and `<dx-icon>` consumes the same registry via a `globalThis.__dxIconRegistry` bridge; its `noCache` property is retained but no longer used.
