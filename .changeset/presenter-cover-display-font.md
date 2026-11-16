---
'@dxos/plugin-presenter': minor
---

The `display` slide font now loads Poiret One instead of naming a face nothing fetched, so a deck set in it showed the fallback sans on every machine that did not happen to have the font installed.

`<Box variant="lockup">` draws a brand mark where a heading would go, at a heading's scale. `<Box variant="fill">` draws its picture to the column's height and lets it run past the column's sides, so the slide crops it rather than the column: art cut at a column's edge ends in mid-air, which `bg-dxos.svg` makes plain since its drawing stops short of its own frame. It stays in the flow, so the words beside it are laid out as though it were not there and still paint over it.

Every heading the slide theme styles takes `text-balance`, so a heading that wraps breaks into even lines instead of leaving one word alone.
