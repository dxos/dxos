---
'@dxos/react-ui-mosaic': minor
'@dxos/react-ui-task': minor
---

`Mosaic.Stack` takes `keepDragged` to keep the dragged tile mounted, and `Mosaic.Tile` takes `nativeDragPreview` to turn off the browser's drag image, so a tile that holds state can stay on its axis during a drag. A tile also stays registered as a drag source while its container scrolls, so a drop during an autoscroll now reaches it. `@dxos/plugin-assistant` adds `ChatPlane`, a composite of reorderable thread columns with a floating prompt, and fixed-height markdown rows are available to the chat editor. `TaskList.Editor` is back to its single-row form: the title with priority and estimate pickers, without the status and assignee pills, and the status, assignee and delegate are set from the row.
