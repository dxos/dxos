//
// Copyright 2026 DXOS.org
//

/** Triangles as flat arrays: three numbers per vertex, three vertex indices per triangle. */
export type Triangles = { positions: number[]; indices: number[] };

/**
 * An OBJ file's geometry: `v x y z` vertices and `f` faces (fan-triangulated; `v/vt/vn` keeps the vertex index).
 * Materials, groups, texture coordinates and normals are ignored. Undefined when it holds no face.
 */
export const parseOBJ = (text: string): Triangles | undefined => {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const raw of text.split('\n')) {
    const [command, ...args] = raw.trim().split(/\s+/);
    if (command === 'v') {
      positions.push(Number(args[0]), Number(args[1]), Number(args[2]));
    } else if (command === 'f') {
      // OBJ indices are 1-based, and negative ones count back from the last vertex read.
      const face = args.map((arg) => {
        const index = parseInt(arg.split('/')[0], 10);
        return index > 0 ? index - 1 : positions.length / 3 + index;
      });
      for (let corner = 2; corner < face.length; corner++) {
        indices.push(face[0], face[corner - 1], face[corner]);
      }
    }
  }
  return positions.length > 0 && indices.length > 0 ? { positions, indices } : undefined;
};
