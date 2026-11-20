---
'@dxos/plugin-debug': patch
---

The DXOS Architecture space template moves from plugin-canvas to plugin-debug and takes the DXOS Deck as its presentation, in place of the ECHO deck: a presentation whose slides are markdown files and whose diagrams are canvas drawings built from `.dx` files, with the element kinds they draw with (card, feed card, chip, heading, plank, app frame). plugin-canvas keeps the architecture partial and no longer contributes a space template.
