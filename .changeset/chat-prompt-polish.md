---
'@dxos/react-ui': patch
'@dxos/plugin-assistant': patch
'@dxos/plugin-search': patch
'@dxos/plugin-space': patch
---

Popups (menus, selects, comboboxes, popovers) no longer draw a focus ring; the highlighted item shows where focus is. In the chat prompt, the usage hint moves from the placeholder to an info icon with a tooltip at the end of the row, "Add an object" is renamed "Add object", and switching between the tasks and context drawers closes the open drawer before the other opens. The search and add-to-collection dialogs keep their input's inner padding.
