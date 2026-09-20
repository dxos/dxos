---
'@dxos/diagram': minor
'@dxos/plugin-illustrator': minor
---

Extract the renderer-neutral scene DSL, dialects, layout engines, diagnostics and SVG content handler from `@dxos/plugin-illustrator/model` into the new `@dxos/diagram` package; the plugin's `model` entry now exports only the ECHO-bound builders (`makeBuilder`, `SvgBuilder`). The DSL gains arrow endpoint ports (`from`/`to` accept `object/element#port`, with `Scene.parseRef` / `Scene.resolveRef`), a `portal` element referencing a nested drawing, and an optional fractional `index` on world objects for z-order.
