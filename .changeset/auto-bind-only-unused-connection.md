---
'@dxos/plugin-connector': patch
---

Stop a newly created object from silently binding to an account that already syncs one. Auto-connect now fires only when the outcome is forced — a single authorized connection, a single-target connector, and nothing bound to it yet — leaving every real choice to the Connect menu.
