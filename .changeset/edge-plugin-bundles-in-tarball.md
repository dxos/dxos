---
'@dxos/plugin-markdown': patch
---

Every plugin EDGE runs (tagged `edge-release`) now ships its checked EDGE bundle in `dist/plugin`, without source maps, so an EDGE deployment can seed its plugin registry straight from the installed package. No `exports` entry names it, so importers see no change.
