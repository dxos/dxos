//
// Copyright 2026 DXOS.org
//

import { Color3, Mesh, PointerEventTypes, Vector3, StandardMaterial, VertexData } from '@babylonjs/core';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useThemeContext } from '@dxos/react-ui';
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
  /** Starting Y screen position for extrusion drag. */
  extrudeStartY: number;
  /** Current extrusion distance. */
  extrudeDistance: number;
};

const INITIAL_STATE: EditorState = {
  selectedFace: null,
  selectedNormal: null,
  extruding: false,
  extrudeStartY: 0,
  extrudeDistance: 0,
};

const CUBE_COLOR = new Color3(0.4, 0.6, 0.9);
const SELECTED_FACE_COLOR = new Color3(1.0, 0.8, 0.0);
const EXTRUDE_SENSITIVITY = 0.02;

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
  const { themeMode } = useThemeContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const selectionMeshRef = useRef<Mesh | null>(null);
  const stateRef = useRef<EditorState>({ ...INITIAL_STATE });
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

      // If extruding, add a box along the face normal.
      if (faceNormal && extrudeDistance > 0) {
        const normal = new Vector3(faceNormal.x, faceNormal.y, faceNormal.z);
        const dist = extrudeDistance;

        const extrudeBox = Manifold.cube(
          [normal.x !== 0 ? dist : 2, normal.y !== 0 ? dist : 2, normal.z !== 0 ? dist : 2],
          true,
        );

        const offset = normal.scale(1 + dist / 2);
        const translated = extrudeBox.translate([offset.x, offset.y, offset.z]);

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

    const manager = new SceneManager({ canvas, themeMode });
    managerRef.current = manager;

    void rebuildMesh(0, null).then(() => setReady(true));

    const resizeObserver = new ResizeObserver(() => manager.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      manager.dispose();
      managerRef.current = null;
    };
  }, [rebuildMesh, themeMode]);

  // Update background when theme changes.
  useEffect(() => {
    managerRef.current?.setThemeMode(themeMode);
  }, [themeMode]);

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
          if (!pointerInfo.pickInfo?.hit || pointerInfo.pickInfo.pickedMesh !== meshRef.current) {
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
          const event = pointerInfo.event as PointerEvent;
          if (event.shiftKey) {
            state.extruding = true;
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
          const deltaY = state.extrudeStartY - event.clientY;
          state.extrudeDistance = Math.max(0, deltaY * EXTRUDE_SENSITIVITY);

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
      {...composableProps(props, { classNames: 'relative' })}
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
    </div>
  );
});
