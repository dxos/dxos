//
// Copyright 2026 DXOS.org
//

import { Color3, Color4, HighlightLayer, Mesh } from '@babylonjs/core';
import React, { type RefObject, useEffect, useRef, useState } from 'react';

import { composable, composableProps } from '@dxos/ui-theme';

import { SceneManager, getManifold, manifoldToBabylon } from '../../engine';
import { ToolManager, SelectTool, MoveTool, ExtrudeTool, type Selection } from '../../tools';
import { type Scene, type Model } from '../../types';
import { type SpacetimeTool, type ViewState } from '../SpacetimeToolbar';

export type SpacetimeCanvasProps = {
  showFps?: boolean;
  scene?: Scene.Scene;
  tool?: SpacetimeTool;
  viewState?: ViewState;
  /** Reactive object count from ECHO subscription. Triggers sync when objects are added/removed. */
  objectCount?: number;
  /** Called when the selected object changes. */
  onSelectionChange?: (objectId: string | null) => void;
};

/**
 * A 3D canvas for creating and editing 3D models using Babylon.js and Manifold.
 */
export const SpacetimeCanvas = composable<HTMLDivElement, SpacetimeCanvasProps>(
  (
    { showFps = true, scene: sceneData, tool = 'select', viewState, objectCount = 0, onSelectionChange, ...props },
    forwardedRef,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const managerRef = useRef<SceneManager | null>(null);
    const toolManagerRef = useRef<ToolManager | null>(null);
    const meshRef = useRef<Mesh | null>(null);
    const meshesRef = useRef<Map<string, Mesh>>(new Map());
    const wasmRef = useRef<Awaited<ReturnType<typeof getManifold>> | null>(null);
    const solidsRef = useRef<Map<string, import('manifold-3d').Manifold>>(new Map());
    const selectionRef = useRef<Selection | null>(null);
    const viewStateRef = useRef<ViewState | undefined>(viewState);
    viewStateRef.current = viewState;
    const onSelectionChangeRef = useRef(onSelectionChange);
    onSelectionChangeRef.current = onSelectionChange;
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

      // Load WASM once, then build meshes from scene objects.
      void getManifold().then((wasm) => {
        wasmRef.current = wasm;
        if (sceneData?.objects?.length) {
          for (const ref of sceneData.objects) {
            const obj = ref?.target as Model.Object | undefined;
            if (!obj) {
              continue;
            }
            const objId = (obj as any).id as string;
            const solid = createSolidFromObject(wasm.Manifold, obj);
            const objectColor = obj.color ? Color3.FromHexString(obj.color) : theme.object;
            const mesh = manifoldToBabylon(solid, {
              scene: manager.scene,
              name: objId ?? 'solid',
              color: objectColor,
            });
            // Keep the Manifold solid alive for tool operations.
            solidsRef.current.set(objId, solid);
            meshRef.current = mesh;
            meshesRef.current.set(objId, mesh);
          }
        }

        // Set up tool manager.
        const toolManager = new ToolManager();
        toolManager.register(new SelectTool());
        toolManager.register(new MoveTool());
        toolManager.register(new ExtrudeTool());
        toolManagerRef.current = toolManager;

        // Create highlight layer for object selection glow.
        // NOTE: neutralColor is set to transparent so non-highlighted meshes (e.g., the grid)
        // don't pick up the selection color in the glow pass.
        const highlightLayer = new HighlightLayer('selection-highlight', manager.scene);
        highlightLayer.outerGlow = true;
        highlightLayer.innerGlow = true;
        highlightLayer.neutralColor = new Color4(0, 0, 0, 0);

        // Create tool context.
        toolManager.setContext({
          scene: manager.scene,
          camera: manager.camera,
          canvas: canvas,
          manifold: wasm,
          echoScene: sceneData,
          meshes: meshesRef.current,
          solids: solidsRef.current,
          highlightLayer,
          getObject: (id: string) => {
            if (!sceneData?.objects) {
              return undefined;
            }
            for (const ref of sceneData.objects) {
              const obj = ref?.target as (Model.Object & { id?: string }) | undefined;
              if (obj && (obj as any).id === id) {
                return obj;
              }
            }
            return undefined;
          },
          get viewState() {
            return viewStateRef.current ?? { selectionMode: 'face' as const, showGrid: true };
          },
          get selection() {
            return selectionRef.current;
          },
          setSelection: (next: Selection | null) => {
            // Clean up previous selection.
            const prev = selectionRef.current;
            if (prev) {
              if (prev.highlightMesh) {
                highlightLayer.removeMesh(prev.highlightMesh);
                prev.highlightMesh.dispose();
              }
              if (prev.type === 'object') {
                highlightLayer.removeMesh(prev.mesh);
              }
            }
            // Apply new selection.
            selectionRef.current = next;
            if (next?.type === 'object') {
              highlightLayer.addMesh(next.mesh, theme.selected);
            } else if (next?.type === 'face' && next.highlightMesh) {
              highlightLayer.addMesh(next.highlightMesh, theme.selected);
            }
            onSelectionChangeRef.current?.(next?.objectId ?? null);
          },
        });

        // Set initial tool.
        toolManager.setActiveTool(tool ?? 'select');

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
        selectionRef.current?.highlightMesh?.dispose();
        selectionRef.current = null;
        toolManagerRef.current?.dispose();
        toolManagerRef.current = null;
        for (const solid of solidsRef.current.values()) {
          solid.delete();
        }
        solidsRef.current.clear();
        clearInterval(fpsInterval);
        resizeObserver.disconnect();
        manager.dispose();
        managerRef.current = null;
      };
    }, []);

    // Delegate pointer events to ToolManager.
    useEffect(() => {
      const manager = managerRef.current;
      const toolManager = toolManagerRef.current;
      if (!manager || !toolManager || !ready) {
        return;
      }

      const observer = manager.scene.onPointerObservable.add((pointerInfo) => {
        toolManager.handlePointer(pointerInfo);
      });

      return () => {
        manager.scene.onPointerObservable.remove(observer);
      };
    }, [ready]);

    // Sync active tool from props.
    useEffect(() => {
      if (toolManagerRef.current && tool) {
        toolManagerRef.current.setActiveTool(tool);
      }
    }, [tool, ready]);

    // Sync view state.
    useEffect(() => {
      if (managerRef.current && viewState) {
        managerRef.current.showGrid = viewState.showGrid;
      }
    }, [viewState, ready]);

    // Sync scene objects — add/remove meshes when ECHO scene changes.
    useEffect(() => {
      const manager = managerRef.current;
      const wasm = wasmRef.current;
      if (!manager || !wasm || !ready) {
        return;
      }

      // Collect current ECHO object ids.
      const objectIds = new Set<string>();
      if (sceneData?.objects) {
        for (const ref of sceneData.objects) {
          const obj = ref?.target as Model.Object | undefined;
          if (!obj) {
            continue;
          }
          const objId = (obj as any).id as string;
          if (!objId) {
            continue;
          }
          objectIds.add(objId);

          // Add new objects.
          if (!meshesRef.current.has(objId)) {
            const solid = createSolidFromObject(wasm.Manifold, obj);
            const objectColor = obj.color ? Color3.FromHexString(obj.color) : theme.object;
            const mesh = manifoldToBabylon(solid, {
              scene: manager.scene,
              name: objId,
              color: objectColor,
            });
            solidsRef.current.set(objId, solid);
            meshesRef.current.set(objId, mesh);
          }
        }
      }

      // Remove deleted objects.
      for (const [objId, mesh] of meshesRef.current) {
        if (!objectIds.has(objId)) {
          mesh.dispose();
          meshesRef.current.delete(objId);
          solidsRef.current.get(objId)?.delete();
          solidsRef.current.delete(objId);
        }
      }
    }, [objectCount, ready]);

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

/** Creates a Manifold solid from a Model.Object based on its primitive type. */
const createSolidFromObject = (Manifold: Awaited<ReturnType<typeof getManifold>>['Manifold'], obj: Model.Object) => {
  const size = [obj.scale.x * 2, obj.scale.y * 2, obj.scale.z * 2] as [number, number, number];
  let solid;
  switch (obj.primitive) {
    case 'sphere':
      solid = Manifold.sphere(size[0] / 2, 24);
      break;
    case 'cylinder':
      solid = Manifold.cylinder(size[1], size[0] / 2, size[0] / 2, 24);
      break;
    case 'torus':
      solid = Manifold.cylinder(size[1] * 0.5, size[0] / 2, size[0] / 2, 24);
      break;
    case 'cube':
    default:
      solid = Manifold.cube(size, true);
      break;
  }
  const translated = solid.translate([obj.position.x, obj.position.y, obj.position.z]);
  solid.delete();
  return translated;
};

// TODO(burdon): Property on object.
const theme = {
  object: new Color3(0.3, 0.3, 0.3),
  selected: new Color3(0.3, 0.6, 1.0),
};
