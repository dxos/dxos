---
'@dxos/react-ui-canvas': patch
'@dxos/plugin-code': minor
---

Specs can declare the specs they build on (`uses` blocks, a plugin's `dependsOn`) and refer into them as `<spec id>#<item>`; the spec viewer links those references, marks broken ones and opens the target spec at the item. A plugin's Open Specification opens the spec as the main plank, and the Canvas plugin now publishes its spec. In the canvas, a link end's marker can be set back to None, and a View node cannot be grouped into or created inside an Object.
