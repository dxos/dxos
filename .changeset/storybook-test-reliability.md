---
'@dxos/react-ui': minor
'@dxos/plugin-projects': patch
---

Typing quickly into a combobox or a controlled `Editor.View` no longer drops characters when the page renders slowly, and Enter picks a combobox's first match even when pressed in the same frame as the typing. A chat feed's jump to the latest message now arrives however long the feed sat idle, and scrolling away while an answer streams is no longer undone. Table cells for any type with a GeoPoint field open their editor instead of an error, and a new feature card's name field takes focus once the board shows it. `useMasonryTileRevealed`, `pin` on `useFollow`'s handle, and the `gate` option on scripted model turns are new.
