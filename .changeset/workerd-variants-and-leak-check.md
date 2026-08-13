---
'@dxos/plugin-client': patch
'@dxos/plugin-markdown': patch
---

The headless (`workerd`) variants of plugin-client and plugin-markdown no longer import their `#capabilities` barrel, which declares React capabilities and so dragged React into worker bundles. plugin-client is a common transitive dependency — plugin-space reaches it through its own operations — so that one leak propagated well beyond the plugin itself.

The `check-module-structure` guards now trace with `workerd,worker,browser`, the conditions wrangler actually uses, instead of `workerd,worker,node`. The `node` condition matched a React-free `#capabilities` variant that no worker ever loads, so every one of these guards was passing against a build that is never shipped.
