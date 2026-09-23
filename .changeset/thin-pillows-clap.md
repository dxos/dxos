---
'@dxos/app-toolkit': patch
'@dxos/react-ui-list': patch
'@dxos/react-ui-menu': patch
'@dxos/react-ui-search': patch
'@dxos/plugin-navtree': patch
'@dxos/plugin-search': patch
'@dxos/util': patch
---

Fix the command palette and search dialog keyboard contract. Both now focus their input on open
(so Enter runs the highlighted entry instead of the dialog's Close button), keep the first result
highlighted as the query changes, and close on Escape rather than only clearing the query.
`Picker.Input`/`SearchList.Input` gain `escapeBehavior`, `SearchList.Root` gains
`resetSelectionOnChange`, and `resolveKeyBinding` in `@dxos/util` applies the platform fallbacks
everywhere a shortcut hint is rendered — shortcuts were blank on Linux despite firing.
