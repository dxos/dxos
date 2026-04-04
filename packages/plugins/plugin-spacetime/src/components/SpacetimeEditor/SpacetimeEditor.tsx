//
// Copyright 2026 DXOS.org
//

import { Color3, Matrix, Mesh, PointerEventTypes, Vector3, StandardMaterial, VertexData } from '@babylonjs/core';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { composable, composableProps } from '@dxos/ui-theme';

import { SceneManager } from '../../engine';
import { getManifold } from '../../engine';
import { manifoldToBabylon, getFaceNormal } from '../../engine';

type EditorState = {
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
  /** Current extrusion distance. */
  extrudeDistance: number;
};

const INITIAL_STATE: EditorState = {
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

  const rebuildMesh = useCallback(
    async (extrudeDistance: number, faceNormal: { x: number; y: number; z: number } | null) => {
      const manager = managerRef.current;
      if (!manager) {
        return;
      }

      const wasm = await getManifold();
      const { Manifold } = wasm;

      // Start with a unit cube centered at origin.
      let solid = Manifold.cube([2, 2, 2], true);

      // If extruding, add a box along the face normal direction.
      if (faceNormal && extrudeDistance > 0) {
        const nx = Math.abs(faceNormal.x);
        const ny = Math.abs(faceNormal.y);
        const nz = Math.abs(faceNormal.z);
        const dist = extrudeDistance;

        // Create extrusion slab: full face size on tangent axes, `dist` thick along normal.
        const extrudeBox = Manifold.cube([nx > 0.5 ? dist : 2, ny > 0.5 ? dist : 2, nz > 0.5 ? dist : 2], true);

        // Position so it touches the cube face and extends outward.
        const ox = faceNormal.x * (1 + dist / 2);
        const oy = faceNormal.y * (1 + dist / 2);
        const oz = faceNormal.z * (1 + dist / 2);
        const translated = extrudeBox.translate([ox, oy, oz]);

        solid = Manifold.union(solid, translated);
        translated.delete();
        extrudeBox.delete();
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
    [],
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

    void rebuildMesh(0, null).then(() => setReady(true));

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
          state.extrudeDistance = Math.max(0, projected * EXTRUDE_SENSITIVITY);

          void rebuildMesh(state.extrudeDistance, state.selectedNormal);
          break;
        }

        case PointerEventTypes.POINTERUP: {
          if (state.extruding) {
            state.extruding = false;
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
