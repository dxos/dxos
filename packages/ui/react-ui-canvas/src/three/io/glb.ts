//
// Copyright 2026 DXOS.org
//

import { type Triangles } from './obj.ts';

/** The ASCII `glTF` that opens every GLB file. */
const GLB_MAGIC = 0x46546c67;

const FLOAT = 5126;
const UNSIGNED_SHORT = 5123;
const UNSIGNED_INT = 5125;
const UNSIGNED_BYTE = 5121;

type Accessor = { bufferView?: number; byteOffset?: number; componentType: number; count: number };
type BufferView = { byteOffset?: number; byteStride?: number };
type Primitive = { attributes?: { POSITION?: number }; indices?: number };
type Gltf = { meshes?: { primitives?: Primitive[] }[]; accessors?: Accessor[]; bufferViews?: BufferView[] };

const isGltf = (value: unknown): value is Gltf => typeof value === 'object' && value !== null;

/**
 * A GLB file's geometry, every mesh primitive's triangles in one list. Read straight from the binary chunk, so a file
 * whose textures cannot load still imports; node transforms are not applied. Undefined when it is not a GLB or holds
 * no indexed triangles.
 */
export const parseGLB = (data: ArrayBuffer): Triangles | undefined => {
  const view = new DataView(data);
  if (data.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) {
    return undefined;
  }
  const jsonLength = view.getUint32(12, true);
  const json: unknown = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, jsonLength)));
  if (!isGltf(json)) {
    return undefined;
  }
  // The binary chunk follows the JSON chunk and its own 8-byte header.
  const binary = 20 + jsonLength + 8;
  const read = (index: number | undefined): number[] | undefined => {
    const accessor = index === undefined ? undefined : json.accessors?.[index];
    const bufferView = accessor?.bufferView === undefined ? undefined : json.bufferViews?.[accessor.bufferView];
    if (!accessor || !bufferView) {
      return undefined;
    }
    const offset = binary + (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    switch (accessor.componentType) {
      case FLOAT:
        return Array.from(new Float32Array(data.slice(offset, offset + accessor.count * 3 * 4)));
      case UNSIGNED_INT:
        return Array.from(new Uint32Array(data.slice(offset, offset + accessor.count * 4)));
      case UNSIGNED_SHORT:
        return Array.from(new Uint16Array(data.slice(offset, offset + accessor.count * 2)));
      case UNSIGNED_BYTE:
        return Array.from(new Uint8Array(data.slice(offset, offset + accessor.count)));
      default:
        return undefined;
    }
  };
  const positions: number[] = [];
  const indices: number[] = [];
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const vertices = read(primitive.attributes?.POSITION);
      const triangles = read(primitive.indices);
      if (!vertices || !triangles) {
        continue;
      }
      const base = positions.length / 3;
      positions.push(...vertices);
      indices.push(...triangles.map((index) => index + base));
    }
  }
  return positions.length > 0 && indices.length > 0 ? { positions, indices } : undefined;
};
