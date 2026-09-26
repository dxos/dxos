//
// Copyright 2026 DXOS.org
//

import Module, { type Manifold } from 'manifold-3d';

export type MeshArrays = { vertices: Float32Array; triangles: Uint32Array };

/** Loads manifold's wasm, which the page serves next to the bundles. */
export const loadManifold = async () => {
  const wasm = await Module({ locateFile: () => '/manifold.wasm' });
  wasm.setup();
  return wasm;
};

/** A CSG job of the kind Spacetime runs: the union of `count` overlapping spheres, as mesh arrays. */
export const unionOfSpheres = (
  manifold: Awaited<ReturnType<typeof loadManifold>>,
  count: number,
  segments: number,
): MeshArrays => {
  let solid: Manifold = manifold.Manifold.sphere(1, segments);
  for (let index = 1; index < count; index++) {
    const sphere = manifold.Manifold.sphere(1, segments).translate([index * 0.6, Math.sin(index) * 0.3, 0]);
    const next = solid.add(sphere);
    solid.delete();
    sphere.delete();
    solid = next;
  }
  const mesh = solid.getMesh();
  solid.delete();
  return { vertices: new Float32Array(mesh.vertProperties), triangles: new Uint32Array(mesh.triVerts) };
};
