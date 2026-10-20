---
'@dxos/app-framework': patch
---

Loading a remote plugin whose entry module resolves to `undefined`, has no default export, or has a throwing factory now fails with a `RemotePluginLoadError` that names the manifest and entry URL, instead of an unhandled `TypeError`.
