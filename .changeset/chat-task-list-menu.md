---
'@dxos/plugin-assistant': patch
'@dxos/react-ui-task': patch
---

The checklist above the chat prompt shares the prompt's surface, sizes to five tasks before it scrolls, and its rows are selectable. Each row's trailing control is a menu with **Execute task** (submits `Implement task #n` to the conversation) and **Delete task**. A selected `TaskList` row no longer shows a focus ring on top of its selection fill.
