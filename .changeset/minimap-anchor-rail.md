---
'@dxos/react-ui-components': minor
'@dxos/react-ui-markdown': minor
'@dxos/plugin-assistant': minor
---

Add a `Minimap` component (`@dxos/react-ui-components`): a vertical rail of ticks representing anchor markers in a scrollable document, with a wave hover animation, per-marker popover, and brighter ticks for the currently-visible range.

`MarkdownStreamController` gains `scrollTo`, `getVisibleRange`, and `onVisibleRangeChange`. In `plugin-assistant` the chat thread now renders a `Chat.Minimap` rail (one tick per prompt turn, scrolls to the turn on click), and prompt prev/next navigation steps through the prompt range table rather than the xml-tag widget bookmarks.
