//
// Copyright 2026 DXOS.org
//

import { Color3, Mesh, PointerEventTypes, Vector3, StandardMaterial, VertexData } from '@babylonjs/core';
import React, { RefObject, useEffect, useRef, useState } from 'react';

import { composable, composableProps } from '@dxos/ui-theme';

import { SceneManager, getManifold, manifoldToBabylon, getFaceNormal } from '../../engine';

export type SpacetimeCanvasProps = {
  showAxes?: boolean;
  showFps?: boolean;
};

export const SpacetimeCanvas = composable<HTMLDivElement, SpacetimeCanvasProps>(
  ({ showAxes = false, showFps = false, ...props }, forwardedRef) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const managerRef = useRef<SceneManager | null>(null);
    const meshRef = useRef<Mesh | null>(null);
    const selectionMeshRef = useRef<Mesh | null>(null);
    const fpsRef = useRef<HTMLSpanElement>(null);
    const [ready, setReady] = useState(false);

    // Initialize Babylon.js scene and Manifold, render initial cube.
    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        return;
      }

      const manager = new SceneManager({ canvas });
      managerRef.current = manager;

      // Load WASM once, then build initial mesh.
      void getManifold().then((wasm) => {
        const solid = wasm.Manifold.cube([2, 2, 2], true);
        meshRef.current = manifoldToBabylon(solid, {
          scene: manager.scene,
          name: 'solid',
          color: CUBE_COLOR,
        });
        solid.delete();
        setReady(true);
      });

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
    }, []);

    // Sync debug settings.
    useEffect(() => {
      if (managerRef.current) {
        managerRef.current.showAxes = showAxes;
      }
    }, [showAxes, ready]);

    // Set up pointer interaction for face picking.
    useEffect(() => {
      const manager = managerRef.current;
      if (!manager || !ready) {
        return;
      }

      const scene = manager.scene;
      const observer = scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) {
          return;
        }

        const pickedMesh = pointerInfo.pickInfo?.pickedMesh;
        if (!pointerInfo.pickInfo?.hit || pickedMesh !== meshRef.current) {
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

        // Build highlight overlay for the selected face.
        selectionMeshRef.current?.dispose();
        selectionMeshRef.current = buildFaceSelectionMesh(faceId, positions, indices, normal, scene);
      });

      return () => {
        scene.onPointerObservable.remove(observer);
      };
    }, [ready]);

    return (
      <div
        {...composableProps(props, { classNames: 'relative bg-(--surface-bg)' })}
        ref={(node) => {
          (containerRef as RefObject<HTMLDivElement | null>).current = node;
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

        {showFps && (
          <span className='absolute bottom-2 left-2 text-xs font-mono opacity-50 pointer-events-none' ref={fpsRef} />
        )}
      </div>
    );
  },
);

const CUBE_COLOR = new Color3(0.4, 0.6, 0.9);
const SELECTED_FACE_COLOR = new Color3(1.0, 0.8, 0.0);

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
