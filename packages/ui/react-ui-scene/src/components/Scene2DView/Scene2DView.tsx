//
// Copyright 2026 DXOS.org
//

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { type Camera, Canvas } from '@dxos/react-ui-canvas';
import type * as Util from '@dxos/react-ui/Util';
import { type Scene } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { toCanvasViews } from '../../canvas/index.ts';

export type Scene2DViewProps = Util.ThemedClassName<{
  document: Scene.SceneDocument;
  /** A react-ui-canvas theme name (flat, outline, glass, classic); the scene's own when unset. */
  theme?: string;
  /** Where to look: the camera given, or `fit` to frame the whole scene. */
  camera?: Scene.Camera2D | 'fit';
}>;

/** The canvas camera that puts `camera.center` at the middle of a viewport of `size`. */
const centredCamera = (camera: Scene.Camera2D, size: { width: number; height: number }): Camera => ({
  x: size.width / (2 * camera.zoom) - camera.center.x,
  y: size.height / (2 * camera.zoom) - camera.center.y,
  zoom: camera.zoom,
});

/** Draws a document's root 2D scene, read-only, through react-ui-canvas; child scenes draw inside their frames. */
export const Scene2DView = ({ classNames, document, theme, camera = 'fit' }: Scene2DViewProps) => {
  const { store, root } = useMemo(() => toCanvasViews(document), [document]);
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

  const scene = document.scenes[0];
  const fit = camera === 'fit';
  const initialCamera = !fit && size ? centredCamera(camera, size) : undefined;
  return (
    <div ref={containerRef} className={mx('relative dx-fill overflow-hidden', classNames)} data-testid='scene.2d'>
      {(fit || initialCamera) && (
        <Canvas.Root
          // A new camera or document remounts the canvas, which only reads its initial camera once.
          key={`${root}:${JSON.stringify(camera)}:${size?.width ?? 0}`}
          store={store}
          root={root}
          readonly
          theme={theme ?? scene?.theme}
          initialCamera={initialCamera}
          initialDisplay={{ snap: false, guides: false, fit }}
        >
          <Canvas.Viewport />
        </Canvas.Root>
      )}
    </div>
  );
};
