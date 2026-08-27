---
'@dxos/app-toolkit': patch
---

Narrow `LayoutOperation`'s `Translations` import to a subpath, removing `@dxos/app-graph` and 37 KB from the eager startup bundle of apps that import it.
