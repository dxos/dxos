---
'@dxos/plugin-canvas': minor
---

`@dxos/plugin-spacetime` is removed; a 3D canvas (`@dxos/plugin-canvas`) now does its work. A 3D canvas places primitives, library objects and imported meshes, joins, subtracts and extrudes them as solids, imports OBJ and GLB files as library meshes and exports STL. Spacetime scenes are not migrated. `@dxos/plugin-canvas/MeshPresets` provides the bundled vehicle models (fire truck, race car, taxi) as mesh objects, and the Demo space template's line-up is now a 3D canvas.
