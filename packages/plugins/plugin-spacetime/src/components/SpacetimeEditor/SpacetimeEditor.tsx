//
// Copyright 2026 DXOS.org
//

import { Color3, Mesh, PointerEventTypes, Vector3, StandardMaterial, VertexData } from '@babylonjs/core';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { SceneManager } from '../../engine';
import { getManifold } from '../../engine';
import { manifoldToBabylon, getFaceNormal } from '../../engine';

export type SpacetimeEditorProps = {
  className?: string;
};

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

export const SpacetimeEditor = ({ className }: SpacetimeEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

        // Create extrusion box: thin slab along the normal direction.
        const extrudeBox = Manifold.cube(
          [normal.x !== 0 ? dist : 2, normal.y !== 0 ? dist : 2, normal.z !== 0 ? dist : 2],
          true,
        );

        // Position the extrusion box on the face.
        const offset = normal.scale(1 + dist / 2);
        const translated = extrudeBox.translate([offset.x, offset.y, offset.z]);

        solid = Manifold.union(solid, translated);
        translated.delete();
        extrudeBox.delete();
      }

      // Remove old mesh.
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
    if (!canvas) {
      return;
    }

    const manager = new SceneManager({ canvas });
    managerRef.current = manager;

    // Build initial cube.
    void rebuildMesh(0, null).then(() => setReady(true));

    // Handle window resize.
    const handleResize = () => manager.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
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
          if (!pointerInfo.pickInfo?.hit || pointerInfo.pickInfo.pickedMesh !== meshRef.current) {
            // Click on empty space — deselect.
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
          const indices = mesh.getIndices()!;
          const normal = getFaceNormal(faceId, positions, indices);

          state.selectedFace = faceId;
          state.selectedNormal = normal;

          // Build a highlight overlay for the selected face (single triangle).
          selectionMeshRef.current?.dispose();
          const selMesh = new Mesh('face-selection', scene);
          const selVd = new VertexData();
          const i0 = indices[faceId * 3];
          const i1 = indices[faceId * 3 + 1];
          const i2 = indices[faceId * 3 + 2];
          selVd.positions = [
            positions[i0 * 3],
            positions[i0 * 3 + 1],
            positions[i0 * 3 + 2],
            positions[i1 * 3],
            positions[i1 * 3 + 1],
            positions[i1 * 3 + 2],
            positions[i2 * 3],
            positions[i2 * 3 + 1],
            positions[i2 * 3 + 2],
          ];
          selVd.indices = [0, 1, 2];
          selVd.normals = [normal.x, normal.y, normal.z, normal.x, normal.y, normal.z, normal.x, normal.y, normal.z];
          selVd.applyToMesh(selMesh);
          const selMat = new StandardMaterial('face-selection-mat', scene);
          selMat.diffuseColor = SELECTED_FACE_COLOR;
          selMat.specularColor = Color3.Black();
          selMat.backFaceCulling = false;
          selMesh.material = selMat;
          // Offset slightly to avoid z-fighting.
          selMesh.position = new Vector3(normal.x * 0.001, normal.y * 0.001, normal.z * 0.001);
          selectionMeshRef.current = selMesh;

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
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
};
