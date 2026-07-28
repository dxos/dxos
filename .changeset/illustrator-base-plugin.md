---
'@dxos/plugin-tldraw': minor
---

Extract the headless diagramming layer into the new `@dxos/plugin-illustrator`: it owns the base `Sketch` type (name + canvas variant ref, mirroring Game/Chess), the scene DSL, dialect registry, sketch skill, and renderer-agnostic create/read/edit operations resolved through a new `SketchVariant` capability. `@dxos/plugin-sketch` is renamed to `@dxos/plugin-tldraw` and, together with `@dxos/plugin-excalidraw`, now contributes a variant (canvas type + scene-DSL builder + surfaces) instead of owning its own root object type.
