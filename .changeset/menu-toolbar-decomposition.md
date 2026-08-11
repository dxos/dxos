---
'@dxos/react-ui-menu': minor
---

`Menu.Toolbar` no longer renders the graph items implicitly — it is now only the attention-gated toolbar container, and the new `Menu.Items` renders the graph-backed items wherever it sits among the toolbar's children, so JSX order controls placement. Every `<Menu.Toolbar />` becomes `<Menu.Toolbar><Menu.Items /></Menu.Toolbar>`; a toolbar mixing its own children with the graph items orders them freely.
