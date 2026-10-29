//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { type Camera, Canvas, createCanvasAtoms } from '@dxos/react-ui-canvas';
import type * as Util from '@dxos/react-ui/Util';
import { type Scene } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { toCanvasViews } from '../../canvas/index.ts';
import { type Theme3D, liftScene } from '../../three/index.ts';
import { Scene3DView } from '../Scene3DView/index.ts';

export type Scene2DViewProps = Util.ThemedClassName<{
  document: Scene.SceneDocument;
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
}>;

/** The canvas camera that puts `camera.center` at the middle of a viewport of `size`. */
const centredCamera = (camera: Scene.Camera2D, size: { width: number; height: number }): Camera => ({
  x: size.width / (2 * camera.zoom) - camera.center.x,
  y: size.height / (2 * camera.zoom) - camera.center.y,
  zoom: camera.zoom,
});

/** Draws a document's root 2D scene, read-only; child scenes draw inside their frames. */
export const Scene2DView = ({ renderer = 'dom', camera3d, theme3d, ...props }: Scene2DViewProps) => {
  const lifted = useMemo(() => (renderer === '3d' ? liftScene(props.document) : undefined), [renderer, props.document]);
  return lifted ? (
    <Scene3DView classNames={props.classNames} document={lifted} camera={camera3d} theme={theme3d} />
  ) : (
    <CanvasView key={props.document.scenes[0]?.id} {...props} />
  );
};

const CanvasView = ({ classNames, document, theme, camera = 'fit' }: Scene2DViewProps) => {
  const registry = useContext(RegistryContext);
  const rootId = document.scenes[0]?.id ?? '';
  // One store and one set of canvas atoms per root; later documents (an animation's samples) are written into them,
  // so the canvas updates in place rather than remounting each frame.
  const [{ store, atoms }] = useState(() => ({
    store: toCanvasViews(document).store,
    atoms: createCanvasAtoms(rootId),
  }));
  useLayoutEffect(() => {
    registry.set(store.views, Object.fromEntries(toCanvasViews(document).views.map((view) => [view.id, view])));
  }, [registry, store, document]);

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

  const fit = camera === 'fit';
  useLayoutEffect(() => {
    if (camera !== 'fit' && size) {
      registry.set(atoms.camera, centredCamera(camera, size));
    }
  }, [registry, atoms, camera, size]);

  const scene = document.scenes[0];
  return (
    <div ref={containerRef} className={mx('relative dx-fill overflow-hidden', classNames)} data-testid='scene.2d'>
      <Canvas.Root
        key={rootId}
        store={store}
        root={rootId}
        atoms={atoms}
        readonly
        theme={theme ?? scene?.theme}
        initialDisplay={{ snap: false, guides: false, fit }}
      >
        <Canvas.Viewport />
      </Canvas.Root>
    </div>
  );
};
