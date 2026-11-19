---
# multiple-changesets: slide-icon-grid-row-span.md is the entry of PR #14623, merged in here
'@dxos/plugin-debug': patch
'@dxos/react-ui-slides': patch
---

plugin-debug gains the DXOS Deck space template: a presentation whose slides are markdown files and whose diagrams are canvas drawings built from `.dx` files, with the element kinds they draw with (card, feed card, chip, heading, plank, app frame). A slide's `<Box variant="title">` now sets its name in Poiret One whatever font the deck picked, as `variant="brand"` does.
