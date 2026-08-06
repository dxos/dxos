---
'@dxos/react-ui-menu': minor
---

`Menu.Toolbar` is now decomposable: `Menu.ToolbarRoot` (the attention-gated toolbar container) plus `Menu.ToolbarItems` (the graph items, container-free) let callers control where the graph items sit among other toolbar children via JSX order. `Menu.Toolbar` is unchanged sugar for the common items-then-children case.
