---
'@dxos/react-ui-assistant': minor
'@dxos/react-ui-mosaic': minor
'@dxos/react-ui-task': minor
---

`Mosaic.Stack` takes `keepDragged` to keep the dragged tile mounted, and `Mosaic.Tile` takes `nativeDragPreview` to turn off the browser's drag image, so a tile that holds state can stay on its axis during a drag, and `reorderOnEnter` to give way to a forward drag as soon as the pointer enters it. A tile also stays registered as a drag source while its container scrolls, so a drop during an autoscroll now reaches it. `@dxos/plugin-assistant` adds `ChatPlane`, a composite of reorderable thread columns with a floating prompt, and fixed-height markdown rows are available to the chat editor. In `TaskList`, an unset priority draws the high bars in a neutral tone and an unset estimate draws a dot.

`ThreadCard` shows a chat's thread (lane) as a card. A lane row now renders through the `AssistantSurface.ThreadCard` role, so a plugin can replace the card, and `Chat.Chat` objects have a card surface.
