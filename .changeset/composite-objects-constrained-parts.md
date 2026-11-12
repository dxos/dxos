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

Double-clicking an Object now edits it where it stands: its parts become what the
editor acts on and the drawing around them fades, as 3D already did. Links gain
an `ortho` variant and the Properties panel a Variant selector (straight,
orthogonal, elbow, curve, spline). The UML class is now one of these composites,
with its typed `attributes` and `methods` bound to its compartments.
