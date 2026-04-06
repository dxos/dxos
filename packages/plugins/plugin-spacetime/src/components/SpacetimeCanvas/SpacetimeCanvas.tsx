//
// Copyright 2026 DXOS.org
//

import { Color3, Color4, HighlightLayer, Mesh, StandardMaterial, Vector3 } from '@babylonjs/core';
import React, { type RefObject, useEffect, useRef, useState } from 'react';

import { composable, composableProps } from '@dxos/ui-theme';

import {
  SceneManager,
  createSolidFromObject,
  getManifold,
  importGLB,
  importOBJ,
  manifoldToBabylon,
  rawDataToBabylon,
} from '../../engine';
import { DebugPanel, extractSolidDebugInfo, type DebugInfo } from './DebugPanel';
import {
  createToolManager,
  ToolManager,
  type Selection,
  type EditorState,
  type ActionResult,
  type SelectionMode,
} from '../../tools';
import { type Scene, Model } from '../../types';
import { type SpacetimeTool, type ViewState } from '../SpacetimeToolbar';

export type SpacetimeCanvasProps = {
  showFps?: boolean;
  scene?: Scene.Scene;
  tool?: SpacetimeTool;
  selectionMode?: string;
  viewState?: ViewState;
  /** Reactive object count from ECHO subscription. Triggers sync when objects are added/removed. */
  objectCount?: number;
  /** Called when the selection changes. Reports all selected object IDs (empty array = cleared). */
  onSelectionChange?: (objectIds: string[]) => void;
  /** Parent ref to expose the solids map for export. */
  parentSolidsRef?: React.RefObject<Map<string, import('manifold-3d').Manifold> | null>;
  /** Ref to set the importGLB callback (canvas provides the implementation). */
  importGLBRef?: React.MutableRefObject<
    (data: ArrayBuffer | string) => Promise<{ vertexData: string; indexData: string } | undefined>
  >;
  /** Ref for editor to dispatch actions through ToolManager. */
  handleActionRef?: React.MutableRefObject<(actionId: string, editorState: EditorState) => ActionResult | undefined>;
  /** Currently selected object id and hue for material updates. */
  selectedObjectId?: string | null;
  selectedHue?: string;
  /** Called when a keyboard shortcut requests a tool change. */
  onToolChange?: (next: { tool: SpacetimeTool }) => void;
  /** Called when a keyboard shortcut requests deletion. */
  onDelete?: () => void;
};

/**
 * A 3D canvas for creating and editing 3D models using Babylon.js and Manifold.
 */
export const SpacetimeCanvas = composable<HTMLDivElement, SpacetimeCanvasProps>(
  (
    {
      showFps = true,
      scene: sceneData,
      tool = 'select',
      selectionMode,
      viewState,
      objectCount = 0,
      onSelectionChange,
      parentSolidsRef,
      importGLBRef,
      handleActionRef,
      selectedObjectId,
      selectedHue,
      onToolChange,
      onDelete,
      ...props
    },
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
    const importedIdsRef = useRef<Set<string>>(new Set());
    // Expose solids map to parent for export functionality.
    if (parentSolidsRef && 'current' in parentSolidsRef) {
      (parentSolidsRef as React.MutableRefObject<Map<string, import('manifold-3d').Manifold> | null>).current =
        solidsRef.current;
    }
    const selectionRef = useRef<Selection | null>(null);
    const setSelectionRef = useRef<((next: Selection | null) => void) | null>(null);
    const selectionModeRef = useRef(selectionMode);
    selectionModeRef.current = selectionMode;
    const [debugInfo, setDebugInfo] = useState<DebugInfo>(null);
    const setDebugInfoRef = useRef(setDebugInfo);
    setDebugInfoRef.current = setDebugInfo;
    const viewStateRef = useRef<ViewState | undefined>(viewState);
    viewStateRef.current = viewState;
    const onSelectionChangeRef = useRef(onSelectionChange);
    onSelectionChangeRef.current = onSelectionChange;
    const onToolChangeRef = useRef<((next: { tool: SpacetimeTool }) => void) | null>(null);
    const onDeleteRef = useRef<(() => void) | null>(null);
    onToolChangeRef.current = onToolChange ?? null;
    onDeleteRef.current = onDelete ?? null;
    const keyDownHandlerRef = useRef<((event: KeyboardEvent) => void) | null>(null);
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
            const objectColor = resolveColor(obj.color);
            const solid = createSolidFromObject(wasm, obj);
            if (solid) {
              const mesh = manifoldToBabylon(solid, {
                scene: manager.scene,
                name: objId ?? 'solid',
                color: objectColor,
              });
              mesh.position = new Vector3(obj.position?.x ?? 0, obj.position?.y ?? 0, obj.position?.z ?? 0);
              solidsRef.current.set(objId, solid);
              meshRef.current = mesh;
              meshesRef.current.set(objId, mesh);
            } else if (obj.mesh?.vertexData && obj.mesh?.indexData) {
              // Non-manifold mesh: render directly from raw data (no CSG support).
              const positions = Model.decodeFloat32Array(obj.mesh.vertexData);
              const indices = Model.decodeUint32Array(obj.mesh.indexData);
              const mesh = rawDataToBabylon(positions, indices, {
                scene: manager.scene,
                name: objId ?? 'raw',
                color: objectColor,
              });
              mesh.position = new Vector3(obj.position?.x ?? 0, obj.position?.y ?? 0, obj.position?.z ?? 0);
              meshRef.current = mesh;
              meshesRef.current.set(objId, mesh);
            }
          }
        }

        // Set up tool manager with all tools and actions.
        const toolManager = createToolManager();
        toolManagerRef.current = toolManager;

        // Create highlight layer for object selection glow.
        // NOTE: neutralColor is set to transparent so non-highlighted meshes (e.g., the grid)
        // don't pick up the selection color in the glow pass.
        const highlightLayer = new HighlightLayer('selection-highlight', manager.scene);
        highlightLayer.outerGlow = true;
        highlightLayer.innerGlow = true;
        highlightLayer.neutralColor = new Color4(0, 0, 0, 0);

        // Selection handler shared between tool context and programmatic selection.
        const setSelection = (next: Selection | null) => {
          // Clean up previous selection.
          const prev = selectionRef.current;
          if (prev) {
            if (prev.type === 'multi-object') {
              for (const entry of prev.entries) {
                highlightLayer.removeMesh(entry.mesh);
              }
            } else {
              if (prev.highlightMesh) {
                highlightLayer.removeMesh(prev.highlightMesh);
                prev.highlightMesh.dispose();
              }
              if (prev.type === 'object') {
                highlightLayer.removeMesh(prev.mesh);
              }
            }
          }
          // Apply new selection.
          selectionRef.current = next;
          if (next?.type === 'object') {
            highlightLayer.addMesh(next.mesh, theme.selected);
          } else if (next?.type === 'face' && next.highlightMesh) {
            highlightLayer.addMesh(next.highlightMesh, theme.selected);
          } else if (next?.type === 'multi-object') {
            for (const entry of next.entries) {
              highlightLayer.addMesh(entry.mesh, theme.selected);
            }
          }
          if (next?.type === 'multi-object') {
            onSelectionChangeRef.current?.(next.entries.map((entry) => entry.objectId));
          } else if (next) {
            onSelectionChangeRef.current?.([next.objectId]);
          } else {
            onSelectionChangeRef.current?.([]);
          }

          // Show vertex table for selected object, or scene overview when nothing selected.
          if (next && next.type !== 'multi-object') {
            const solid = solidsRef.current.get(next.objectId);
            const meshPos = next.mesh?.position;
            const position: [number, number, number] | undefined = meshPos
              ? [meshPos.x, meshPos.y, meshPos.z]
              : undefined;
            if (solid) {
              setDebugInfoRef.current(extractSolidDebugInfo(solid, position));
            } else {
              // Non-manifold mesh: show basic info from the Babylon mesh.
              const babylonMesh = meshesRef.current.get(next.objectId);
              const totalIndices = babylonMesh?.getTotalIndices() ?? 0;
              const totalVerts = babylonMesh?.getTotalVertices() ?? 0;
              setDebugInfoRef.current({
                type: 'mesh',
                tris: totalIndices / 3,
                verts: totalVerts,
                position,
              });
            }
          } else {
            setDebugInfoRef.current(extractSceneDebugInfo(sceneData));
          }
        };
        setSelectionRef.current = setSelection;

        // Create tool context.
        toolManager.setContext({
          manifold: wasm,
          scene: manager.scene,
          camera: manager.camera,
          canvas: canvas,
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
          get selectionState() {
            return { selectionMode: selectionModeRef.current as SelectionMode };
          },
          get selection() {
            return selectionRef.current;
          },
          setSelection,
          setDebugStats: (stats: Record<string, string | number>) => {
            setDebugInfoRef.current({ type: 'stats', entries: stats });
          },
        });

        // Set initial tool.
        toolManager.setActiveTool(tool ?? 'select');

        if (handleActionRef) {
          handleActionRef.current = (actionId, editorState) => toolManager.handleAction(actionId, editorState);
        }

        // Keyboard shortcuts scoped to canvas focus.
        keyDownHandlerRef.current = (event: KeyboardEvent) => {
          const target = event.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
          }

          switch (event.key.toLowerCase()) {
            case 'm':
              onToolChangeRef.current?.({ tool: 'move' });
              break;
            case 'e':
              onToolChangeRef.current?.({ tool: 'extrude' });
              break;
            case 'x':
            case 'backspace':
              onDeleteRef.current?.();
              break;
          }
        };

        canvas.setAttribute('tabindex', '0');
        canvas.addEventListener('keydown', keyDownHandlerRef.current);

        // Provide GLB import callback to parent.
        if (importGLBRef) {
          importGLBRef.current = async (data: ArrayBuffer | string) => {
            let solid;
            if (typeof data === 'string') {
              solid = importOBJ(data, wasm);
            } else {
              solid = await importGLB(data, wasm, manager.scene);
            }
            if (!solid) {
              return undefined;
            }
            // Serialize mesh data for ECHO storage.
            const meshData = solid.getMesh();
            const { vertProperties, triVerts, numProp } = meshData;
            // Extract just positions (first 3 of numProp per vertex).
            const numVert = vertProperties.length / numProp;
            const positions = new Float32Array(numVert * 3);
            for (let vi = 0; vi < numVert; vi++) {
              positions[vi * 3] = vertProperties[vi * numProp];
              positions[vi * 3 + 1] = vertProperties[vi * numProp + 1];
              positions[vi * 3 + 2] = vertProperties[vi * numProp + 2];
            }
            solid.delete();
            return {
              vertexData: Model.encodeTypedArray(positions),
              indexData: Model.encodeTypedArray(new Uint32Array(triVerts)),
            };
          };
        }

        setReady(true);
        setDebugInfo(extractSceneDebugInfo(sceneData));
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
        if (keyDownHandlerRef.current) {
          canvas.removeEventListener('keydown', keyDownHandlerRef.current);
          keyDownHandlerRef.current = null;
        }
        const cleanupSelection = selectionRef.current;
        if (cleanupSelection && cleanupSelection.type !== 'multi-object') {
          cleanupSelection.highlightMesh?.dispose();
        }
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

    // Sync selected object material color when hue changes.
    useEffect(() => {
      if (!selectedObjectId || !selectedHue) {
        return;
      }
      const mesh = meshesRef.current.get(selectedObjectId);
      if (mesh?.material instanceof StandardMaterial) {
        mesh.material.diffuseColor = resolveColor(selectedHue);
      }
    }, [selectedHue, selectedObjectId]);

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
            const objectColor = resolveColor(obj.color);
            const solid = createSolidFromObject(wasm, obj);
            if (solid) {
              const mesh = manifoldToBabylon(solid, {
                scene: manager.scene,
                name: objId,
                color: objectColor,
              });
              mesh.position = new Vector3(obj.position?.x ?? 0, obj.position?.y ?? 0, obj.position?.z ?? 0);
              solidsRef.current.set(objId, solid);
              meshesRef.current.set(objId, mesh);
            } else if (obj.mesh?.vertexData && obj.mesh?.indexData) {
              const positions = Model.decodeFloat32Array(obj.mesh.vertexData);
              const indices = Model.decodeUint32Array(obj.mesh.indexData);
              const mesh = rawDataToBabylon(positions, indices, {
                scene: manager.scene,
                name: objId,
                color: objectColor,
              });
              mesh.position = new Vector3(obj.position?.x ?? 0, obj.position?.y ?? 0, obj.position?.z ?? 0);
              meshesRef.current.set(objId, mesh);
            }
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

      // Programmatically select object when selectedObjectId is set but not yet selected.
      const currentSelectionObjectId =
        selectionRef.current && selectionRef.current.type !== 'multi-object' ? selectionRef.current.objectId : null;
      if (selectedObjectId && currentSelectionObjectId !== selectedObjectId) {
        const mesh = meshesRef.current.get(selectedObjectId);
        if (mesh && setSelectionRef.current) {
          setSelectionRef.current({ type: 'object', objectId: selectedObjectId, mesh, highlightMesh: null });
        }
      } else if (!selectionRef.current) {
        // Refresh scene overview when nothing is selected.
        setDebugInfo(extractSceneDebugInfo(sceneData));
      }
    }, [objectCount, selectedObjectId, ready]);

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

        {viewState?.showDebug && <DebugPanel info={debugInfo} />}
      </div>
    );
  },
);

/** Map DXOS hue names to approximate Babylon Color3 values. */
const hueColors: Record<string, Color3> = {
  red: new Color3(0.8, 0.2, 0.2),
  orange: new Color3(0.9, 0.5, 0.1),
  amber: new Color3(0.9, 0.7, 0.1),
  yellow: new Color3(0.9, 0.8, 0.1),
  lime: new Color3(0.5, 0.8, 0.1),
  green: new Color3(0.2, 0.7, 0.2),
  emerald: new Color3(0.2, 0.7, 0.5),
  teal: new Color3(0.1, 0.7, 0.7),
  cyan: new Color3(0.1, 0.7, 0.9),
  sky: new Color3(0.2, 0.6, 0.9),
  blue: new Color3(0.2, 0.4, 0.8),
  indigo: new Color3(0.3, 0.3, 0.8),
  violet: new Color3(0.5, 0.3, 0.8),
  purple: new Color3(0.6, 0.2, 0.8),
  fuchsia: new Color3(0.8, 0.2, 0.7),
  pink: new Color3(0.9, 0.3, 0.5),
  rose: new Color3(0.9, 0.3, 0.4),
};

/** Resolve a hue name or hex string to a Babylon Color3. */
const resolveColor = (color: string | undefined): Color3 => {
  if (!color) {
    return theme.object;
  }
  if (color.startsWith('#')) {
    return Color3.FromHexString(color);
  }
  return hueColors[color] ?? theme.object;
};

const theme = {
  object: new Color3(0.3, 0.3, 0.3),
  selected: new Color3(1.0, 0.2, 0.2),
};

/** Build scene overview debug info from ECHO scene data. */
const extractSceneDebugInfo = (sceneData?: Scene.Scene): DebugInfo => {
  if (!sceneData?.objects?.length) {
    return { type: 'scene', objects: [] };
  }
  const objects = sceneData.objects
    .map((ref) => {
      const obj = ref?.target as (Model.Object & { id?: string }) | undefined;
      if (!obj) {
        return undefined;
      }
      return {
        id: (obj as any).id as string,
        label: obj.label,
        primitive: obj.primitive,
        hasMesh: !!obj.mesh,
        position: [obj.position?.x ?? 0, obj.position?.y ?? 0, obj.position?.z ?? 0] as [number, number, number],
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null);
  return { type: 'scene', objects };
};
