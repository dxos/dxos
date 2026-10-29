---
'@dxos/react-ui-canvas': minor
---

The dynamic projection lays a graph out on a lattice and orders it to read cleanly.

- `DynamicOptions.lattice` places one node per lattice cell, draws the lattice guides, and snaps moved nodes onto free cells.
- `DynamicOptions.arrange` chooses how ranked nodes take their cells:
  - `crossings` is the new default. Each rank is ordered to minimise edge crossings; previously nodes were in id order within each rank.
  - `rank` keeps that previous id order.
  - `routed` starts from `crossings`, then moves and swaps nodes to lower the cost of the links as they are routed through the lattice gutters.
  - `force` and `force-free` run a d3-force layout. `force` snaps the result to free cells; `force-free` leaves it where it came to rest. `DynamicOptions.force` tunes attraction, repulsion and repulsion range.
- New exports: `improveSlots`, `routeCost` and `latticeEnds`.
- Masonry draws a selected tile's ring on an overlay above the tile, so an opaque tile (such as a card) no longer hides it.
- The markdown editor shows the link button (`decorateMarkdown`'s `renderLinkButton`) after bare URLs and `<url>` autolinks too, as it does for `[label](url)` links.
