---
'@dxos/react-ui': patch
'@dxos/react-ui-canvas': patch
'@dxos/react-ui-chat': patch
'@dxos/react-ui-editor': patch
'@dxos/plugin-assistant': patch
'@dxos/plugin-search': patch
'@dxos/plugin-space': patch
---

Popups (menus, selects, comboboxes, popovers) no longer draw a focus ring; the highlighted item shows where focus is. In the chat prompt, the placeholder is shortened to "/ for skills, @ for content", "Add an object" is renamed "Add object", and switching between the tasks and context drawers closes the open drawer before the other opens. The search and add-to-collection dialogs keep their input's inner padding. The prompt's command completions render as a react-ui-list Listbox in a popover above the editor, at most 8 rows tall, whose arrow keys stop at the first and last command instead of wrapping; Escape closes it and leaves focus in the editor. An editor no longer moves focus to its host on an Escape CodeMirror already acted on.

A polyline locked while its vertices are being edited loses its vertex handles, Delete no longer removes a vertex from it, and a vertex drag the lock lands in the middle of neither previews nor commits a change.
