//
// Copyright 2026 DXOS.org
//

import {
  Color3,
  Mesh,
  PointerEventTypes,
  StandardMaterial,
  Vector3,
  VertexData,
  type PointerInfo,
} from '@babylonjs/core';

import { getFaceNormal } from '../../engine';
import { type ToolContext } from '../tool-context';
import { type Tool } from '../tool';

const theme = {
  selected: new Color3(1.0, 0.2, 0.2),
};

/** Tool for selecting objects or faces via ray-picking. */
export class SelectTool implements Tool {
  readonly id = 'select';

  activate(_ctx: ToolContext): void {}

  deactivate(_ctx: ToolContext): void {
    // Selection persists across tool switches.
  }

  onPointerDown(ctx: ToolContext, info: PointerInfo): boolean {
    if (info.type !== PointerEventTypes.POINTERDOWN) {
      return false;
    }

    const pickedMesh = info.pickInfo?.pickedMesh;
    if (!info.pickInfo?.hit || !pickedMesh) {
      ctx.setSelection(null);
      return false;
    }

    // Check if picked mesh belongs to our managed meshes.
    let objectId: string | undefined;
    for (const [id, mesh] of ctx.meshes) {
      if (mesh === pickedMesh) {
        objectId = id;
        break;
      }
    }

    if (!objectId) {
      ctx.setSelection(null);
      return false;
    }

    const mesh = pickedMesh as Mesh;

    if (ctx.editorState.selectionMode === 'object') {
      const event = info.event as PointerEvent;

      if (event.shiftKey) {
        // Multi-select: toggle this object in/out of the selection list.
        const current = ctx.selection;
        if (current?.type === 'multi-object') {
          const existsIdx = current.objects.findIndex((entry) => entry.objectId === objectId);
          if (existsIdx >= 0) {
            // Remove from multi-selection.
            const next = current.objects.filter((_, idx) => idx !== existsIdx);
            if (next.length === 1) {
              ctx.setSelection({ type: 'object', objectId: next[0].objectId, mesh: next[0].mesh, highlightMesh: null });
            } else if (next.length === 0) {
              ctx.setSelection(null);
            } else {
              ctx.setSelection({ type: 'multi-object', objects: next });
            }
          } else {
            // Add to multi-selection.
            ctx.setSelection({
              type: 'multi-object',
              objects: [...current.objects, { objectId, mesh }],
            });
          }
        } else if (current?.type === 'object') {
          if (current.objectId === objectId) {
            ctx.setSelection(null);
          } else {
            ctx.setSelection({
              type: 'multi-object',
              objects: [
                { objectId: current.objectId, mesh: current.mesh },
                { objectId, mesh },
              ],
            });
          }
        } else {
          // No selection or face selection: start fresh single select.
          ctx.setSelection({ type: 'object', objectId, mesh, highlightMesh: null });
        }
        return true;
      }

      // Normal click: single select.
      ctx.setSelection({ type: 'object', objectId, mesh, highlightMesh: null });
      return true;
    }

    // Face selection mode.
    return selectFace(ctx, info);
  }

  onPointerMove(_ctx: ToolContext, _info: PointerInfo): boolean {
    return false;
  }

  onPointerUp(_ctx: ToolContext, _info: PointerInfo): boolean {
    return false;
  }
}

/**
 * Builds a highlight overlay mesh for all coplanar triangles sharing the clicked face's normal.
 */
const buildFaceSelectionMesh = (
  faceId: number,
  positions: Float32Array | number[],
  indices: Uint32Array | number[],
  normal: { x: number; y: number; z: number },
  scene: import('@babylonjs/core').Scene,
): Mesh => {
  const selPositions: number[] = [];
  const selNormals: number[] = [];
  const selIndices: number[] = [];
  let vertCount = 0;

  const refIdx = indices[faceId * 3];

  const numTris = indices.length / 3;
  for (let tri = 0; tri < numTris; tri++) {
    const triNormal = getFaceNormal(tri, positions, indices);
    const dot = triNormal.x * normal.x + triNormal.y * normal.y + triNormal.z * normal.z;
    if (dot < 0.99) {
      continue;
    }

    // Check coplanarity: vertex must lie on same plane as reference face.
    const triIdx = indices[tri * 3];
    const dx = positions[triIdx * 3] - positions[refIdx * 3];
    const dy = positions[triIdx * 3 + 1] - positions[refIdx * 3 + 1];
    const dz = positions[triIdx * 3 + 2] - positions[refIdx * 3 + 2];
    const planeDist = Math.abs(dx * normal.x + dy * normal.y + dz * normal.z);
    if (planeDist > 0.01) {
      continue;
    }

    for (let vi = 0; vi < 3; vi++) {
      const idx = indices[tri * 3 + vi];
      selPositions.push(positions[idx * 3], positions[idx * 3 + 1], positions[idx * 3 + 2]);
      selNormals.push(normal.x, normal.y, normal.z);
    }
    selIndices.push(vertCount, vertCount + 1, vertCount + 2);
    vertCount += 3;
  }

  const selMesh = new Mesh('face-selection', scene);
  const selVd = new VertexData();
  selVd.positions = selPositions;
  selVd.indices = selIndices;
  selVd.normals = selNormals;
  selVd.applyToMesh(selMesh);

  // Transparent material — the HighlightLayer provides the glow.
  const selMat = new StandardMaterial('face-selection-mat', scene);
  selMat.emissiveColor = theme.selected;
  selMat.alpha = 0.3;
  selMat.backFaceCulling = false;
  selMesh.material = selMat;

  // Offset along normal to avoid z-fighting with the underlying geometry.
  selMesh.position = new Vector3(normal.x * 0.01, normal.y * 0.01, normal.z * 0.01);
  selMesh.isPickable = false;
  return selMesh;
};

/**
 * Picks a face from the pointer event and sets it as the selection.
 * Shared by SelectTool (in face mode) and ExtrudeTool (when no face is pre-selected).
 * Returns true if a face was selected.
 */
export const selectFace = (ctx: ToolContext, info: PointerInfo): boolean => {
  const pickedMesh = info.pickInfo?.pickedMesh;
  if (!info.pickInfo?.hit || !pickedMesh) {
    ctx.setSelection(null);
    return false;
  }

  let objectId: string | undefined;
  for (const [id, mesh] of ctx.meshes) {
    if (mesh === pickedMesh) {
      objectId = id;
      break;
    }
  }

  if (!objectId) {
    ctx.setSelection(null);
    return false;
  }

  const mesh = pickedMesh as Mesh;
  const faceId = info.pickInfo.faceId;
  if (faceId === -1) {
    return false;
  }

  const positions = mesh.getVerticesData('position')!;
  const indices = mesh.getIndices()! as number[];
  const normal = getFaceNormal(faceId, positions, indices);

  const highlightMesh = buildFaceSelectionMesh(faceId, positions, indices, normal, ctx.scene);
  highlightMesh.parent = mesh;
  ctx.setSelection({ type: 'face', objectId, mesh, faceId, normal, highlightMesh });
  return true;
};
