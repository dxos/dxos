//
// Copyright 2026 DXOS.org
//

import { SceneLoader } from '@babylonjs/core';
import { type Mesh as BabylonMesh, VertexBuffer } from '@babylonjs/core';
import type { ManifoldToplevel, Manifold } from 'manifold-3d';

import { log } from '@dxos/log';
// Register GLTF/GLB loader plugin.
import '@babylonjs/loaders/glTF';

/**
 * Imports a GLB file and converts it to a Manifold solid.
 *
 * Uses Babylon's SceneLoader to parse the GLB, extracts vertex/index data
 * from the loaded meshes, and constructs a Manifold solid.
 * Textures are ignored — we only extract geometry.
 */
export const importGLB = async (
  data: ArrayBuffer,
  wasm: ManifoldToplevel,
  scene: import('@babylonjs/core').Scene,
): Promise<Manifold | null> => {
  const { Manifold } = wasm;

  log.info('importGLB: starting', { size: data.byteLength });

  // Create a Blob URL for the GLB data.
  const blob = new Blob([data], { type: 'model/gltf-binary' });
  const blobUrl = URL.createObjectURL(blob);

  // Suppress texture loading errors — we only need geometry.
  SceneLoader.ShowLoadingScreen = false;

  let container;
  try {
    container = await SceneLoader.LoadAssetContainerAsync('', blobUrl, scene, undefined, '.glb');
  } catch (error) {
    log.info('importGLB: SceneLoader failed, trying without textures', { error });
    // If loading fails (e.g., missing textures), try parsing the GLB binary directly.
    URL.revokeObjectURL(blobUrl);
    return importGLBDirect(data, wasm);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }

  log.info('importGLB: loaded container', {
    meshCount: container.meshes.length,
    meshNames: container.meshes.map((m) => m.name),
  });

  // Extract mesh data from all loaded meshes.
  const meshes = container.meshes.filter((mesh): mesh is BabylonMesh => mesh.getTotalVertices() > 0);

  log.info('importGLB: meshes with vertices', { count: meshes.length });

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
      log.info('importGLB: mesh has no vertex data', { name: babylonMesh.name });
      continue;
    }

    log.info('importGLB: processing mesh', {
      name: babylonMesh.name,
      vertices: positions.length / 3,
      triangles: indices.length / 3,
    });

    const vertProperties = new Float32Array(positions);
    const triVerts = new Uint32Array(indices);

    try {
      const mesh = new wasm.Mesh({ numProp: 3, vertProperties, triVerts });
      mesh.merge();
      const solid = new Manifold(mesh);

      if (result) {
        const merged: Manifold = Manifold.union(result, solid);
        result.delete();
        solid.delete();
        result = merged;
      } else {
        result = solid;
      }
    } catch (error) {
      log.info('importGLB: failed to create Manifold from mesh', { name: babylonMesh.name, error });
      continue;
    }
  }

  container.dispose();

  if (result) {
    log.info('importGLB: success', { tris: result.getMesh().numTri, volume: result.volume() });
  }

  return result;
};

/**
 * Direct GLB binary parser — extracts geometry without Babylon's SceneLoader.
 * Handles files with external texture references that cause SceneLoader to fail.
 */
export const importGLBDirect = (data: ArrayBuffer, wasm: ManifoldToplevel): Manifold | null => {
  const { Manifold } = wasm;

  // Parse GLB header.
  const view = new DataView(data);
  const magic = view.getUint32(0, true);
  if (magic !== 0x46546c67) {
    // 'glTF'
    log.info('importGLBDirect: not a valid GLB file');
    return null;
  }

  const jsonLength = view.getUint32(12, true);
  const jsonChunk = new TextDecoder().decode(new Uint8Array(data, 20, jsonLength));
  const gltf = JSON.parse(jsonChunk);

  // Binary chunk starts after JSON chunk (20 byte header + jsonLength + 8 byte chunk header).
  const binOffset = 20 + jsonLength + 8;
  const binData = new Uint8Array(data, binOffset);

  log.info('importGLBDirect: parsed GLB', {
    meshCount: gltf.meshes?.length,
    accessorCount: gltf.accessors?.length,
  });

  if (!gltf.meshes || !gltf.accessors || !gltf.bufferViews) {
    return null;
  }

  let result: Manifold | null = null;

  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives) {
      const posAccessorIdx = primitive.attributes?.POSITION;
      const idxAccessorIdx = primitive.indices;
      if (posAccessorIdx === undefined || idxAccessorIdx === undefined) {
        continue;
      }

      const posAccessor = gltf.accessors[posAccessorIdx];
      const idxAccessor = gltf.accessors[idxAccessorIdx];
      const posView = gltf.bufferViews[posAccessor.bufferView];
      const idxView = gltf.bufferViews[idxAccessor.bufferView];

      const posOffset = (posView.byteOffset ?? 0) + (posAccessor.byteOffset ?? 0);
      const idxOffset = (idxView.byteOffset ?? 0) + (idxAccessor.byteOffset ?? 0);

      const vertProperties = new Float32Array(binData.buffer, binData.byteOffset + posOffset, posAccessor.count * 3);
      const componentType = idxAccessor.componentType;
      let triVerts: Uint32Array;
      if (componentType === 5123) {
        // UNSIGNED_SHORT
        const shortIndices = new Uint16Array(binData.buffer, binData.byteOffset + idxOffset, idxAccessor.count);
        triVerts = Uint32Array.from(shortIndices);
      } else {
        triVerts = new Uint32Array(binData.buffer, binData.byteOffset + idxOffset, idxAccessor.count);
      }

      log.info('importGLBDirect: primitive', {
        meshName: mesh.name,
        vertices: posAccessor.count,
        triangles: idxAccessor.count / 3,
      });

      try {
        const manifoldMesh = new wasm.Mesh({ numProp: 3, vertProperties, triVerts });
        manifoldMesh.merge();
        const solid = new Manifold(manifoldMesh);

        if (result) {
          const merged: Manifold = Manifold.union(result, solid);
          result.delete();
          solid.delete();
          result = merged;
        } else {
          result = solid;
        }
      } catch (error) {
        log.info('importGLBDirect: failed to create Manifold', { meshName: mesh.name, error });
        continue;
      }
    }
  }

  if (result) {
    log.info('importGLBDirect: success', { tris: result.getMesh().numTri, volume: result.volume() });
  }

  return result;
};
