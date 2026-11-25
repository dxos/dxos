---
'@dxos/plugin-assistant': minor
'@dxos/react-ui-task': patch
'@dxos/react-ui-virtual': patch
---

`ChatPlane` columns are full height, bordered and capped at 40rem, and a column's prompt renders inside it while the column is selected, so only that column gives up height to its prompt. `ChatPlane.Root` takes `align='start'` to rest the selection, or a group of columns that fits, at the start of the strip; a centered plane always centers the selected column. The left and right arrow keys step between columns from inside a thread. `ThemePlugin` takes `followDocument`, which makes it follow the page's `dark` class instead of the OS, so a host such as storybook can own the theme. A task list rendered `flush` drops the well around its title field, and `Chat.Suggestions` truncates a chip longer than the composer. A virtualized list now re-measures a row that grows without a commit of its own, such as a card whose surface fills in late, before the frame paints, so a list pinned to its end no longer jumps a row after it loads.
