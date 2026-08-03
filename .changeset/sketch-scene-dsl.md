---
'@dxos/plugin-tldraw': minor
---

Add a backend-neutral scene DSL to the tldraw plugin: agents can create, edit, and delete diagrams as world objects composed of elements (rect, ellipse, circle, diamond, triangle, line, curve, arc, text, arrow) addressed by id, via the `DrawingOperation.Create`/`Read`/`Edit` operations and the `org.dxos.skill.drawing` agent skill. Renderers implement the shared `DrawingBuilder` contributed by `@dxos/plugin-illustrator`.
