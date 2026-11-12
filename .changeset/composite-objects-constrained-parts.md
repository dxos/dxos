---
'@dxos/scene': minor
'@dxos/diagram': minor
'@dxos/react-ui-canvas': minor
'@dxos/react-ui-canvas-editor': minor
'@dxos/plugin-uml': minor
---

Composite objects whose parts follow their frame, declared in the scene DSL.

A part of a composite can now say, per axis, which of its edges follow the frame
(`constrain` over `min | max | stretch | center | scale`), so an Object drawn at
another size lays itself out instead of scaling like a picture — a card's footer
stays on its floor and its body grows. A tool declares its shape as DSL source
(`composite <id> { element … }`) rather than painting it in a React view, and
every shape that tool draws is an Instance of one definition, so restyling any
of them reaches them all while each one's text stays its own.

A `polyline` part authors its vertices in the DSL (`points="0,0.5 1,0.5"`), as
fractions of its own frame, so a template can draw a rule that stretches with the
shape it is in — which is what a card's hairline now is, rather than a flat box
standing in for one.

A part may be `optional`: it is switched off for one Instance from the Properties
panel, the part naming it in `grow` takes its room, and a part that `follows`
another goes with it — so a card without a footer is the same Object as a card
with one, not a second definition. A part `bind`s to any field of the Instance,
not only text, so a card's glyph is its own typed `icon`.

Double-clicking an Object now edits it where it stands: its parts become what the
editor acts on and the drawing around them fades, as 3D already did. Links gain
an `ortho` variant and the Properties panel a Variant selector (straight,
orthogonal, elbow, curve, spline).

The built-in Card and the UML class are now composites themselves: each declares
its template and places an Instance of it, so its regions are parts in the Views
tree, edited in place, with the data still typed on the shape. `@dxos/react-ui-canvas-editor`
gains a `./testing` entry point so a plugin's own kind can be rendered through the
shared editor in a story.
