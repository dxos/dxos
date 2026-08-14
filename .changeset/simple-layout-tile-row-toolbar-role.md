---
'@dxos/react-ui': patch
'@dxos/plugin-simple-layout': patch
---

Restore `role="toolbar"` on `Toolbar.Root`, which was erased when no role was passed, forward an explicit `role='none'` instead of falling back to the default, and lay out simple-layout navigation tiles as a single row instead of stacking the icon, label, and caret.
