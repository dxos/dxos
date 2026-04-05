//
// Copyright 2026 DXOS.org
//

import type { Manifold } from 'manifold-3d';

/**
 * Exports a Manifold solid as a binary STL file.
 *
 * Binary STL format:
 * - 80 bytes header
 * - 4 bytes: number of triangles (uint32)
 * - Per triangle (50 bytes each):
 *   - 12 bytes: normal (3 x float32)
 *   - 36 bytes: 3 vertices (9 x float32)
 *   - 2 bytes: attribute byte count (uint16, usually 0)
 */
export const exportSTL = (solid: Manifold): ArrayBuffer => {
  const mesh = solid.getMesh();
  const { vertProperties, triVerts, numProp, numTri } = mesh;

  const bufferSize = 80 + 4 + numTri * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Header (80 bytes, zeroed).
  let offset = 80;

  // Number of triangles.
  view.setUint32(offset, numTri, true);
  offset += 4;

  for (let tri = 0; tri < numTri; tri++) {
    const vi0 = triVerts[tri * 3];
    const vi1 = triVerts[tri * 3 + 1];
    const vi2 = triVerts[tri * 3 + 2];

    const p0x = vertProperties[vi0 * numProp];
    const p0y = vertProperties[vi0 * numProp + 1];
    const p0z = vertProperties[vi0 * numProp + 2];
    const p1x = vertProperties[vi1 * numProp];
    const p1y = vertProperties[vi1 * numProp + 1];
    const p1z = vertProperties[vi1 * numProp + 2];
    const p2x = vertProperties[vi2 * numProp];
    const p2y = vertProperties[vi2 * numProp + 1];
    const p2z = vertProperties[vi2 * numProp + 2];

    // Compute face normal.
    const ax = p1x - p0x;
    const ay = p1y - p0y;
    const az = p1z - p0z;
    const bx = p2x - p0x;
    const by = p2y - p0y;
    const bz = p2z - p0z;
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    }

    // Normal.
    view.setFloat32(offset, nx, true); offset += 4;
    view.setFloat32(offset, ny, true); offset += 4;
    view.setFloat32(offset, nz, true); offset += 4;

    // Vertex 0.
    view.setFloat32(offset, p0x, true); offset += 4;
    view.setFloat32(offset, p0y, true); offset += 4;
    view.setFloat32(offset, p0z, true); offset += 4;

    // Vertex 1.
    view.setFloat32(offset, p1x, true); offset += 4;
    view.setFloat32(offset, p1y, true); offset += 4;
    view.setFloat32(offset, p1z, true); offset += 4;

    // Vertex 2.
    view.setFloat32(offset, p2x, true); offset += 4;
    view.setFloat32(offset, p2y, true); offset += 4;
    view.setFloat32(offset, p2z, true); offset += 4;

    // Attribute byte count.
    view.setUint16(offset, 0, true); offset += 2;
  }

  return buffer;
};

/** Triggers a browser download of an ArrayBuffer as a file. */
export const downloadFile = (buffer: ArrayBuffer, filename: string, mimeType = 'application/octet-stream'): void => {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
