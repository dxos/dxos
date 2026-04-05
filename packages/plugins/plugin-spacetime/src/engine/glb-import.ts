//
// Copyright 2026 DXOS.org
//

import { SceneLoader } from '@babylonjs/core';
import { type Mesh as BabylonMesh, VertexBuffer } from '@babylonjs/core';
import type { ManifoldToplevel, Manifold } from 'manifold-3d';

// Register GLTF/GLB loader plugin.
import '@babylonjs/loaders/glTF';

/**
 * Imports a GLB file and converts it to a Manifold solid.
 *
 * Uses Babylon's SceneLoader to parse the GLB, extracts vertex/index data
 * from the loaded meshes, and constructs a Manifold solid.
 *
 * @param data GLB file data as ArrayBuffer or data URL.
 * @param wasm Manifold WASM module.
 * @param scene Babylon scene for temporary mesh loading.
 * @returns The constructed Manifold solid, or null if import failed.
 */
export const importGLB = async (
  data: ArrayBuffer,
  wasm: ManifoldToplevel,
  scene: import('@babylonjs/core').Scene,
): Promise<Manifold | null> => {
  const { Manifold } = wasm;

  // Create a Blob URL to avoid base64 encoding stack overflow on large files.
  const blob = new Blob([data], { type: 'model/gltf-binary' });
  const blobUrl = URL.createObjectURL(blob);

  let container;
  try {
    container = await SceneLoader.LoadAssetContainerAsync('', blobUrl, scene, undefined, '.glb');
  } finally {
    URL.revokeObjectURL(blobUrl);
  }

  // Extract mesh data from all loaded meshes.
  const meshes = container.meshes.filter(
    (mesh): mesh is BabylonMesh => mesh.getTotalVertices() > 0,
  );

  if (meshes.length === 0) {
    container.dispose();
    return null;
  }

  // Merge all meshes into a single Manifold solid.
  let result: Manifold | null = null;

  for (const babylonMesh of meshes) {
    const positions = babylonMesh.getVerticesData(VertexBuffer.PositionKind);
    const indices = babylonMesh.getIndices();
    if (!positions || !indices) {
      continue;
    }

    // Convert to Manifold Mesh format.
    const numVert = positions.length / 3;
    const vertProperties = new Float32Array(positions);
    const triVerts = new Uint32Array(indices);

    try {
      const mesh = new wasm.Mesh({ numProp: 3, vertProperties, triVerts });
      const solid = new Manifold(mesh);

      if (result) {
        const merged: Manifold = Manifold.union(result, solid);
        result.delete();
        solid.delete();
        result = merged;
      } else {
        result = solid;
      }
    } catch {
      // Skip non-manifold meshes.
      continue;
    }
  }

  // Clean up the loaded container.
  container.dispose();

  return result;
};

/**
 * Reads a File as an ArrayBuffer.
 */
export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
