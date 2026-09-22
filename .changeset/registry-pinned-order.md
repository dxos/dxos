---
'@dxos/plugin-registry': patch
---

The plugin registry now always sits above settings in the sidebar's pinned items. Both nodes used `Position.first`, so their order depended on plugin load order.
