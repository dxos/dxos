---
# multiple-changesets: slide-heading-colors.md is PR #14612's own entry, merged in here until it lands on main
'@dxos/plugin-debug': patch
'@dxos/react-ui-slides': patch
---

plugin-debug gains the DXOS Deck space template: a presentation whose slides are markdown files and whose diagrams are canvas drawings built from `.dx` files, with the element kinds they draw with (card, feed card, chip, heading, plank, app frame). A slide's `<Box variant="title">` now sets its name in Poiret One whatever font the deck picked, as `variant="brand"` does.
