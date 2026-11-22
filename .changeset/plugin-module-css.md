---
'@dxos/app-framework': patch
---

CSS imported by a plugin module now loads in a production app build: the plugin manifest lists the stylesheets each module body adds to the page, and they are linked before the body is imported.
