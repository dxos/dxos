//
// Copyright 2026 DXOS.org
//

import { Color3, Mesh } from '@babylonjs/core';
import React, { type RefObject, useEffect, useRef, useState } from 'react';

import { composable, composableProps } from '@dxos/ui-theme';

import { SceneManager, getManifold, manifoldToBabylon } from '../../engine';
import { ToolManager, SelectTool, MoveTool, ExtrudeTool } from '../../tools';
import { type Scene, type Model } from '../../types';
import { type SpacetimeTool } from '../SpacetimeToolbar';

export type SpacetimeCanvasProps = {
  scene?: Scene.Scene;
  tool?: SpacetimeTool;
  showAxes?: boolean;
  showFps?: boolean;
};

export const SpacetimeCanvas = composable<HTMLDivElement, SpacetimeCanvasProps>(
  ({ scene: sceneData, tool = 'select', showAxes = false, showFps = false, ...props }, forwardedRef) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const managerRef = useRef<SceneManager | null>(null);
    const meshRef = useRef<Mesh | null>(null);
    const toolManagerRef = useRef<ToolManager | null>(null);
    const meshesRef = useRef<Map<string, Mesh>>(new Map());
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

      // Load WASM once, then build initial mesh from scene objects or fallback cube.
      void getManifold().then((wasm) => {
        if (sceneData?.objects?.length) {
          const obj = sceneData.objects[0]?.target;
          if (!obj) {
            setReady(true);
            return;
          }
          const solid = createSolidFromObject(wasm.Manifold, obj);
          const objectColor = obj.color ? Color3.FromHexString(obj.color) : theme.object;
          meshRef.current = manifoldToBabylon(solid, {
            scene: manager.scene,
            name: 'solid',
            color: objectColor,
          });
          solid.delete();
        } else {
          const solid = wasm.Manifold.cube([2, 2, 2], true);
          meshRef.current = manifoldToBabylon(solid, {
            scene: manager.scene,
            name: 'solid',
            color: theme.object,
          });
          solid.delete();
        }

        // Track meshes for tool context.
        if (meshRef.current && sceneData?.objects?.length) {
          const obj = sceneData.objects[0]?.target;
          if (obj) {
            const objId = (obj as any).id as string;
            if (objId) {
              meshesRef.current.set(objId, meshRef.current);
            }
          }
        }

        // Set up tool manager.
        const toolManager = new ToolManager();
        toolManager.register(new SelectTool());
        toolManager.register(new MoveTool());
        toolManager.register(new ExtrudeTool());
        toolManagerRef.current = toolManager;

        // Create tool context.
        toolManager.setContext({
          scene: manager.scene,
          camera: manager.camera,
          canvas: canvas,
          manifold: wasm,
          echoScene: sceneData,
          meshes: meshesRef.current,
          getObject: (id: string) => {
            if (!sceneData?.objects) {
              return undefined;
            }
            for (const ref of sceneData.objects) {
              if ((ref?.target as any)?.id === id) {
                return ref?.target as Model.Object;
              }
            }
            return undefined;
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
        toolManagerRef.current?.dispose();
        toolManagerRef.current = null;
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

const theme = {
  object: new Color3(0.3, 0.3, 0.3),
};
