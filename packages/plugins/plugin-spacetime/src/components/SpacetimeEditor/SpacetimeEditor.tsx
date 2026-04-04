//
// Copyright 2026 DXOS.org
//

import { Color3, Matrix, Mesh, PointerEventTypes, Vector3, StandardMaterial, VertexData } from '@babylonjs/core';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { composable, composableProps } from '@dxos/ui-theme';

import { SceneManager } from '../../engine';
import { getManifold } from '../../engine';
import { manifoldToBabylon, getFaceNormal } from '../../engine';

type Extrusion = {
  normal: { x: number; y: number; z: number };
  distance: number;
};

type EditorState = {
  /** Committed extrusions applied to the base cube. */
  extrusions: Extrusion[];
  /** Currently selected face index, or null. */
  selectedFace: number | null;
  /** Normal of the selected face. */
  selectedNormal: { x: number; y: number; z: number } | null;
  /** Whether user is currently extruding (shift + drag). */
  extruding: boolean;
  /** Starting screen position for extrusion drag. */
  extrudeStartX: number;
  extrudeStartY: number;
  /** Screen-space direction of the normal (for drag mapping). */
  extrudeScreenDirX: number;
  extrudeScreenDirY: number;
  /** Current in-progress extrusion distance. */
  extrudeDistance: number;
};

const INITIAL_STATE: EditorState = {
  extrusions: [],
  selectedFace: null,
  selectedNormal: null,
  extruding: false,
  extrudeStartX: 0,
  extrudeStartY: 0,
  extrudeScreenDirX: 0,
  extrudeScreenDirY: -1,
  extrudeDistance: 0,
};

const CUBE_COLOR = new Color3(0.4, 0.6, 0.9);
const SELECTED_FACE_COLOR = new Color3(1.0, 0.8, 0.0);
const EXTRUDE_SENSITIVITY = 0.02;

/**
 * Projects the face normal into screen space and stores the direction in editor state.
 * This determines which mouse drag direction maps to positive extrusion.
 */
/**
 * Projects the face normal into screen space and stores the direction in editor state.
 * This determines which mouse drag direction maps to positive extrusion.
 */
const computeExtrudeScreenDir = (
  state: EditorState,
  normal: { x: number; y: number; z: number },
  scene: import('@babylonjs/core').Scene,
  camera: import('@babylonjs/core').ArcRotateCamera,
  canvas: HTMLCanvasElement,
) => {
  const viewProjection = scene.getTransformMatrix();
  const viewport = camera.viewport.toGlobal(canvas.clientWidth, canvas.clientHeight);
  const worldOrigin = Vector3.Project(Vector3.Zero(), Matrix.Identity(), viewProjection, viewport);
  const worldTip = Vector3.Project(
    new Vector3(normal.x, normal.y, normal.z),
    Matrix.Identity(),
    viewProjection,
    viewport,
  );
  const sdx = worldTip.x - worldOrigin.x;
  const sdy = worldTip.y - worldOrigin.y;
  const slen = Math.sqrt(sdx * sdx + sdy * sdy);
  state.extrudeScreenDirX = slen > 0 ? sdx / slen : 0;
  state.extrudeScreenDirY = slen > 0 ? sdy / slen : -1;
};

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
  const numTris = indices.length / 3;
  const selPositions: number[] = [];
  const selNormals: number[] = [];
  const selIndices: number[] = [];
  let vertCount = 0;

  const refIdx = indices[faceId * 3];

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

  const selMat = new StandardMaterial('face-selection-mat', scene);
  selMat.emissiveColor = SELECTED_FACE_COLOR;
  selMat.diffuseColor = Color3.Black();
  selMat.specularColor = Color3.Black();
  selMat.backFaceCulling = false;
  selMesh.material = selMat;

  // Offset along normal to avoid z-fighting with the underlying geometry.
  selMesh.position = new Vector3(normal.x * 0.01, normal.y * 0.01, normal.z * 0.01);

  return selMesh;
};

export const SpacetimeEditor = composable<HTMLDivElement>((props, forwardedRef) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const selectionMeshRef = useRef<Mesh | null>(null);
  const stateRef = useRef<EditorState>({ ...INITIAL_STATE });
  const fpsRef = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);

  /**
   * Applies an extrusion to a Manifold solid and returns the result.
   * Caller is responsible for deleting the returned Manifold.
   */
  const applyExtrusion = useCallback(
    (
      Manifold: Awaited<ReturnType<typeof getManifold>>['Manifold'],
      solid: ReturnType<Awaited<ReturnType<typeof getManifold>>['Manifold']['cube']>,
      extrusion: Extrusion,
    ) => {
      const { normal, distance } = extrusion;
      if (distance === 0) {
        return solid;
      }

      const absDist = Math.abs(distance);
      const sign = distance > 0 ? 1 : -1;

      const bbox = solid.boundingBox();
      const minX = bbox.min[0];
      const minY = bbox.min[1];
      const minZ = bbox.min[2];
      const maxX = bbox.max[0];
      const maxY = bbox.max[1];
      const maxZ = bbox.max[2];

      const anx = Math.abs(normal.x);
      const any = Math.abs(normal.y);
      const anz = Math.abs(normal.z);

      // Slab dimensions: full bounding box size on tangent axes, `absDist` on normal axis.
      const slabW = anx > 0.5 ? absDist : maxX - minX;
      const slabH = any > 0.5 ? absDist : maxY - minY;
      const slabD = anz > 0.5 ? absDist : maxZ - minZ;
      const extrudeBox = Manifold.cube([slabW, slabH, slabD], true);

      if (sign > 0) {
        // Outward: position slab outside the face, union.
        const cx = (minX + maxX) / 2 + normal.x * ((anx > 0.5 ? (maxX - minX) / 2 : 0) + absDist / 2);
        const cy = (minY + maxY) / 2 + normal.y * ((any > 0.5 ? (maxY - minY) / 2 : 0) + absDist / 2);
        const cz = (minZ + maxZ) / 2 + normal.z * ((anz > 0.5 ? (maxZ - minZ) / 2 : 0) + absDist / 2);
        const translated = extrudeBox.translate([cx, cy, cz]);
        const result = Manifold.union(solid, translated);
        translated.delete();
        extrudeBox.delete();
        return result;
      } else {
        // Inward: position slab inside the face, subtract.
        const cx = (minX + maxX) / 2 + normal.x * ((anx > 0.5 ? (maxX - minX) / 2 : 0) - absDist / 2);
        const cy = (minY + maxY) / 2 + normal.y * ((any > 0.5 ? (maxY - minY) / 2 : 0) - absDist / 2);
        const cz = (minZ + maxZ) / 2 + normal.z * ((anz > 0.5 ? (maxZ - minZ) / 2 : 0) - absDist / 2);
        const translated = extrudeBox.translate([cx, cy, cz]);
        const result = Manifold.difference(solid, translated);
        translated.delete();
        extrudeBox.delete();
        return result;
      }
    },
    [],
  );

  const rebuildMesh = useCallback(
    async (inProgressExtrusion?: Extrusion) => {
      const manager = managerRef.current;
      if (!manager) {
        return;
      }

      const wasm = await getManifold();
      const { Manifold } = wasm;
      const state = stateRef.current;

      // Start with base cube.
      let solid = Manifold.cube([2, 2, 2], true);

      // Apply all committed extrusions.
      for (const extrusion of state.extrusions) {
        const next = applyExtrusion(Manifold, solid, extrusion);
        if (next !== solid) {
          solid.delete();
          solid = next;
        }
      }

      // Apply in-progress extrusion preview.
      if (inProgressExtrusion && inProgressExtrusion.distance !== 0) {
        const next = applyExtrusion(Manifold, solid, inProgressExtrusion);
        if (next !== solid) {
          solid.delete();
          solid = next;
        }
      }

      if (meshRef.current) {
        meshRef.current.dispose();
      }

      meshRef.current = manifoldToBabylon(solid, {
        scene: manager.scene,
        name: 'solid',
        color: CUBE_COLOR,
      });

      solid.delete();
    },
    [applyExtrusion],
  );

  // Initialize Babylon.js scene and Manifold, render initial cube.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const manager = new SceneManager({ canvas });
    managerRef.current = manager;

    void rebuildMesh().then(() => setReady(true));

    const resizeObserver = new ResizeObserver(() => manager.resize());
    resizeObserver.observe(container);

    // Update FPS counter every 500ms.
    const fpsInterval = setInterval(() => {
      if (fpsRef.current) {
        fpsRef.current.textContent = `${manager.fps.toFixed(0)} fps`;
      }
    }, 500);

    return () => {
      clearInterval(fpsInterval);
      resizeObserver.disconnect();
      manager.dispose();
      managerRef.current = null;
    };
  }, [rebuildMesh]);

  // Set up pointer interaction for face picking and extrusion.
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !ready) {
      return;
    }

    const scene = manager.scene;

    const observer = scene.onPointerObservable.add((pointerInfo) => {
      const state = stateRef.current;

      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN: {
          const event = pointerInfo.event as PointerEvent;
          const pickedMesh = pointerInfo.pickInfo?.pickedMesh;
          const hitMainMesh = pickedMesh === meshRef.current;
          const hitSelectionMesh = pickedMesh === selectionMeshRef.current;

          // Shift-click on selection overlay: start extruding the already-selected face.
          if (event.shiftKey && hitSelectionMesh && state.selectedNormal) {
            computeExtrudeScreenDir(state, state.selectedNormal, scene, manager.camera, canvasRef.current!);
            selectionMeshRef.current?.dispose();
            selectionMeshRef.current = null;
            state.extruding = true;
            state.extrudeStartX = event.clientX;
            state.extrudeStartY = event.clientY;
            state.extrudeDistance = 0;
            manager.camera.detachControl();
            break;
          }

          if (!pointerInfo.pickInfo?.hit || !hitMainMesh) {
            state.selectedFace = null;
            state.selectedNormal = null;
            selectionMeshRef.current?.dispose();
            selectionMeshRef.current = null;
            return;
          }

          const faceId = pointerInfo.pickInfo.faceId;
          if (faceId === -1) {
            return;
          }

          const mesh = meshRef.current!;
          const positions = mesh.getVerticesData('position')!;
          const indices = mesh.getIndices()! as number[];
          const normal = getFaceNormal(faceId, positions, indices);

          state.selectedFace = faceId;
          state.selectedNormal = normal;

          // Build highlight overlay for the selected face.
          selectionMeshRef.current?.dispose();
          selectionMeshRef.current = buildFaceSelectionMesh(faceId, positions, indices, normal, scene);

          // Start extrusion if shift is held.
          if (event.shiftKey) {
            computeExtrudeScreenDir(state, normal, scene, manager.camera, canvasRef.current!);
            selectionMeshRef.current?.dispose();
            selectionMeshRef.current = null;
            state.extruding = true;
            state.extrudeStartX = event.clientX;
            state.extrudeStartY = event.clientY;
            state.extrudeDistance = 0;
            manager.camera.detachControl();
          }
          break;
        }

        case PointerEventTypes.POINTERMOVE: {
          if (!state.extruding) {
            return;
          }

          const event = pointerInfo.event as PointerEvent;
          // Project mouse delta onto the screen-space normal direction.
          const dx = event.clientX - state.extrudeStartX;
          const dy = event.clientY - state.extrudeStartY;
          const projected = dx * state.extrudeScreenDirX + dy * state.extrudeScreenDirY;
          state.extrudeDistance = projected * EXTRUDE_SENSITIVITY;

          void rebuildMesh({ normal: state.selectedNormal!, distance: state.extrudeDistance });
          break;
        }

        case PointerEventTypes.POINTERUP: {
          if (state.extruding) {
            // Commit the extrusion if distance != 0.
            if (state.extrudeDistance !== 0 && state.selectedNormal) {
              state.extrusions.push({
                normal: { ...state.selectedNormal },
                distance: state.extrudeDistance,
              });
              // No rebuild needed — the current mesh already shows the final state.
            }
            state.extruding = false;
            state.extrudeDistance = 0;
            // Clear selection after extrusion.
            state.selectedFace = null;
            state.selectedNormal = null;
            selectionMeshRef.current?.dispose();
            selectionMeshRef.current = null;
            manager.camera.attachControl(canvasRef.current!, true);
          }
          break;
        }
      }
    });

    return () => {
      scene.onPointerObservable.remove(observer);
    };
  }, [ready, rebuildMesh]);

  return (
    <div
      {...composableProps(props, { classNames: 'relative bg-(--surface-bg)' })}
      ref={(node) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      }}
    >
      <canvas
        className='absolute inset-0 w-full h-full block outline-none'
        onContextMenu={(event) => event.preventDefault()}
        ref={canvasRef}
      />
      <span className='absolute bottom-2 left-2 text-xs font-mono opacity-50 pointer-events-none' ref={fpsRef} />
    </div>
  );
});
