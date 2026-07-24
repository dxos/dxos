---
'@dxos/plugin-sketch': minor
---

Add a backend-neutral scene DSL to the sketch plugin: agents can create, edit, and delete diagrams as world objects composed of elements (rect, ellipse, circle, diamond, triangle, line, curve, arc, text, arrow) addressed by id, via new readSketch/editSketch operations and an org.dxos.skill.sketch agent skill. SketchBuilder is promoted from testing to the public model module (`SketchModel`).
