# Engine

## Architecture

**Manifold** is the source of truth for geometry.
Manifold solids (WASM objects) define the actual shape: vertices, faces, topology.
Geometry operations (extrusion via `warp()`, boolean union/difference) happen in Manifold space.

**Babylon** is purely for rendering and interaction.
The Manifold solid is converted to Babylon mesh data (positions, normals, indices) via `manifoldToBabylon` / `updateMeshFromManifold`.
Babylon handles picking (which face did the user click) and visual manipulation during drag (`mesh.position`).

## Coordinate Spaces

### Object space (Manifold)

Manifold vertices are in **object-local coordinates** centered at the origin.
A 2x2x2 cube has vertices at `[-1,-1,-1]` to `[1,1,1]`.
All CSG and `warp()` operations work in this space.
The Manifold solid does not know about world position — it only stores the shape.

### World space (Babylon)

The Babylon `Mesh.position` property places the object in the world.
When a mesh has `position = (3, 0, 2)`, all its local vertices are rendered offset by that amount.
Babylon's picking system returns `pickedPoint` in world space (local + position).

### How they interact

```
Manifold solid (object space: vertices at origin)
    → extractVertexData (flat-shaded, CW winding swap)
    → Babylon Mesh (rendered at mesh.position in world space)
    → User clicks → Babylon picks faceId + world-space pickedPoint
    → faceId fed back to Manifold for warp() / CSG
    → Updated Manifold solid → updated Babylon mesh
```

The **move tool** changes `mesh.position` (world space) and commits to ECHO `Model.Object.position`.
The Manifold solid's vertices are unchanged — the object moves in the world without modifying geometry.

The **extrude tool** calls `Manifold.warp()` to move face vertices (object space).
The Manifold solid changes shape. The Babylon mesh is rebuilt from the new geometry.
Vertex count and triangle count are preserved since `warp()` is a topological operation.

### Important: bounding info

After updating mesh geometry via `updateMeshFromManifold`, call `mesh.refreshBoundingInfo()`.
Babylon's ray-picking uses the bounding box for fast rejection.
Without refreshing, clicks outside the old bounds are rejected even if the geometry now extends there.
