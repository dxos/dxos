---
'@dxos/plugin-markdown': patch
---

Plugins that run on EDGE now include their EDGE bundle in `dist/plugin`, without source maps, so an EDGE deployment can seed its plugin registry from the installed package. This adds roughly 2–25 MB to each such package; imports are unchanged.
