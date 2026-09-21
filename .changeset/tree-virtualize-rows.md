---
'@dxos/echo': minor
---

`Tree` takes a `virtualize` prop, which renders a row's heading and columns only while the row is
on screen and holds its measured height in their place. Every row stays in the DOM, so focus, drag
targets and the keymap are unchanged. A task list turns it on, so a project's backlog builds the
rows a reader can see rather than all of them.
