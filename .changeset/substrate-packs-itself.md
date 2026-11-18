---
'@dxos/plugin-canvas': patch
---

The substrate field packs its own spaces. Its nine circles were the cached output of the deck's packer, stored on
the node as a list — the one shape neither DSL layer can write — so a drawing rebuilt from its text fell back to a
single space and the Hyperspace slide's hexagon emptied on every rebuild.

The packing's parameters are now the node's own (`spaceCount`, `rmin`, `rmax`, `gap`, beside the `seed` it already
had), and the field packs from them whenever it has no stored `spaces`. That is the design's "the rule is
authoritative, geometry is a cached projection" applied to the one kind that needed it: the stored packing still
wins where a drawing has one, so nothing re-lays-out on load.

With this, the Hyperspace slide survives the whole records → text → records cycle: ten cards with their glyphs and
tones, three planks with their content, nine packed spaces, and two routed connectors.
