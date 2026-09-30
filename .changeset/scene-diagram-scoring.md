---
'@dxos/diagram': minor
'@dxos/plugin-illustrator': minor
---

Diagrams can now be graded on one 0–1 scale: `Score` turns layout constraints and costs (including new overlapping-text and overlapping-arrow diagnostics) into scores, `Architecture` and `Aesthetics` judge content and drawn layout against written rules in one `DecisionModel` call, and `View` renders a layout as text for judges that cannot read images. Flowcharts gain UML relation kinds drawn with the existing markers and a translucent `tint` fill for group frames, and the illustrator adds a Score operation and a live Scores companion so an assistant can score and redraw a drawing.
