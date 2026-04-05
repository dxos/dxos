# Engine

**Manifold** is the source of truth for geometry. 
Manifold solids (WASM objects) define the actual shape: vertices, faces, topology.
CSG operations (union, difference, extrude) happen in Manifold space.

**Babylon** is purely for rendering and interaction. 
The Manifold solid is converted to Babylon mesh data (positions, normals, indices) via `manifoldToBabylon` / `updateMeshFromManifold`.
Babylon also handles picking (which face did the user click) and visual manipulation during drag (mesh.position).
