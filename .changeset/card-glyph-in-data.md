---
'@dxos/plugin-canvas': patch
'@dxos/react-ui-canvas': patch
---

A card's glyph, body and footer survive the DSL. They sat on the node itself, which is the one place the text
form does not carry, so a drawing rebuilt from its DSL came back with every card blank — all ten icons on the
studio deck's Hyperspace slide. They now live in the kind's own `data` bag, which is where `parts.ts` says a
plugin kind keeps its fields and already addresses them as `data.<field>`.

The glyph is stored as the bare name `iconOf` has always accepted, not wrapped in `{ type }`, so it is a scalar
the DSL can write. `iconOf` and `textOf` read the node first and then the bag, so a kind still carrying these on
the node renders unchanged.
