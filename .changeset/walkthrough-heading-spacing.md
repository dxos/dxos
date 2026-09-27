---
'@dxos/plugin-github': patch
'@dxos/react-ui-task': minor
---

The walkthrough puts a blank line before each section heading, reading a code fence closed only on a bare marker line and treating CRLF line endings as line endings.

**Breaking:** `TaskMnemonic` no longer takes `classNames`; it renders its id in tabular numerals rather than monospace. A task row's ordinal carries `data-testid='taskList.item.ordinal'`.
