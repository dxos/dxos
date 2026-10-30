//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { type Camera, Canvas, type NodeRegistry, createCanvasAtoms, createMemoryStore } from '@dxos/react-ui-canvas';
import { toRenderLists2D } from '@dxos/react-ui-canvas/headless';
import type * as Util from '@dxos/react-ui/Util';
import { type Scene, findScene, rootScene } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { latticesKey, layoutProjection } from '../../canvas/index.ts';
import { type Theme3D, liftScene } from '../../three/index.ts';
import { Scene3DView } from '../Scene3DView/index.ts';

export type Scene2DViewProps = Util.ThemedClassName<{
  document: Scene.SceneDocument;
  /** The scene to draw, by id; the document's root scene when unset. */
  scene?: string;
  /** A react-ui-canvas theme name (flat, outline, glass, classic); the scene's own when unset. */
  theme?: string;
  /** Where to look: the camera given, or `fit` to frame the whole scene. */
  camera?: Scene.Camera2D | 'fit';
  /** `dom` draws through react-ui-canvas; `3d` lifts the scene onto the ground plane and draws it with Babylon. */
  renderer?: 'dom' | '3d';
  /** With the `3d` renderer, where to look; top-down over the scene's own camera when unset. */
  camera3d?: Scene.Camera3D;
  /** With the `3d` renderer, its theme. */
  theme3d?: Theme3D;
  /** The node types the `dom` renderer draws (a host's object frames among them); the default set when unset. */
  nodes?: NodeRegistry;
  /** The room a fit leaves around the drawing, as a fraction of the view; the canvas's default when unset. */
  margin?: number;
  /** Whether the `dom` renderer draws its grid and background grid; on when unset. */
  grid?: boolean;
  /** Draws no surface under the scene, so what is behind it (a slide) shows through. */
  transparent?: boolean;
}>;

/** The canvas camera that puts `camera.center` at the middle of a viewport of `size`. */
const centredCamera = (camera: Scene.Camera2D, size: { width: number; height: number }): Camera => ({
  x: size.width / (2 * camera.zoom) - camera.center.x,
  y: size.height / (2 * camera.zoom) - camera.center.y,
  zoom: camera.zoom,
});

/** Draws a document's 2D scene, read-only: its layout through its camera, composites' parts inside their frames. */
export const Scene2DView = ({ renderer = 'dom', camera3d, theme3d, ...props }: Scene2DViewProps) => {
  const lifted = useMemo(() => (renderer === '3d' ? liftScene(props.document) : undefined), [renderer, props.document]);
  return lifted ? (
    <Scene3DView
      classNames={props.classNames}
      document={lifted}
      scene={props.scene}
      camera={camera3d}
      theme={theme3d}
    />
  ) : (
    <CanvasView key={props.scene ?? rootScene(props.document)?.id} {...props} />
  );
};

const CanvasView = ({
  classNames,
  document,
  scene: sceneId,
  theme,
  camera = 'fit',
  nodes,
  margin,
  grid = true,
  transparent,
}: Scene2DViewProps) => {
  const registry = useContext(RegistryContext);
  const scene = sceneId === undefined ? rootScene(document) : findScene(document, sceneId);
  // One store and one set of canvas atoms per root; later documents (an animation's samples) are written into them,
  // so the canvas updates in place rather than remounting each frame.
  const [{ store, atoms, rootId }] = useState(() => {
    const { lists, root } = toRenderLists2D(document, scene);
    return { store: createMemoryStore(lists, {}, { root }), atoms: createCanvasAtoms(root), rootId: root };
  });
  useLayoutEffect(() => {
    registry.set(
      store.views,
      Object.fromEntries(toRenderLists2D(document, scene).lists.map((list) => [list.id, list])),
    );
  }, [registry, store, document, scene]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>();
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A layout with a lattice puts its shapes on its cells and routes links along its gutters, as the editor draws it.
  const latest = useRef(document);
  latest.current = document;
  const lattices = latticesKey(document);
  const createProjection = useMemo(() => layoutProjection(() => latest.current), [lattices]);

  const fit = camera === 'fit';
  useLayoutEffect(() => {
    if (camera !== 'fit' && size) {
      registry.set(atoms.camera, centredCamera(camera, size));
    }
  }, [registry, atoms, camera, size]);

  return (
    <div ref={containerRef} className={mx('relative dx-fill overflow-hidden', classNames)} data-testid='scene.2d'>
      <Canvas.Root
        key={rootId}
        store={store}
        root={rootId}
        atoms={atoms}
        nodes={nodes}
        createProjection={createProjection}
        margin={margin}
        readonly
        transparent={transparent}
        theme={theme ?? scene?.theme}
        initialDisplay={{ snap: grid, guides: false, fit }}
        backgroundGrid={grid ? undefined : 'none'}
      >
        <Canvas.Viewport />
      </Canvas.Root>
    </div>
  );
};
