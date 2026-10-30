//
// Copyright 2026 DXOS.org
//

import React, { useLayoutEffect, useMemo, useRef } from 'react';

import { type Instance3D } from '@dxos/animation';
import type * as Util from '@dxos/react-ui/Util';
import { type Scene, findScene, rootScene } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { type GeometrySource, SceneLabels, type Theme3D, isTheme3D, renderList } from '../../three/index.ts';
import { DEFAULT_CAMERA, useManifoldGeometry, useOrbit, useSceneRenderer } from './hooks.ts';

export type Scene3DViewProps = Util.ThemedClassName<{
  document: Scene.SceneDocument;
  /** The scene to draw, by id; the document's root scene when unset. */
  scene?: string;
  /** `cad` or `presentation`; the scene's own when unset. */
  theme?: Theme3D;
  /** Draws the ground grid. */
  grid?: boolean;
  /** Draws the x, y and z axes, in red, green and blue. */
  axes?: boolean;
  /** Where to look; the root scene's camera when unset. */
  camera?: Scene.Camera3D;
  /** Element values that replace those of the scene's layout, as an animation sample does. */
  overrides?: Readonly<Record<string, Partial<Scene.Element3D>>>;
  /** Geometry for items Babylon has no builder for; Manifold's, loaded when the scene has solids, by default. */
  geometry?: GeometrySource;
  effects?: readonly Instance3D[];
  /** Drag orbits, shift-drag pans, the wheel zooms; off where something else drives the camera. */
  orbit?: boolean;
  /** Called after each frame is drawn, with the size it was drawn at. */
  onFrameDrawn?: (viewport: { width: number; height: number }) => void;
}>;

/** Draws a document's 3D scene with Babylon, once per change of its inputs, with HTML labels on top. */
export const Scene3DView = ({
  classNames,
  document: doc,
  scene: sceneId,
  theme,
  grid = false,
  axes = false,
  camera,
  overrides,
  geometry: givenGeometry,
  effects,
  orbit = true,
  onFrameDrawn,
}: Scene3DViewProps) => {
  const geometry = useManifoldGeometry(doc, givenGeometry);
  const root = sceneId === undefined ? rootScene(doc) : findScene(doc, sceneId);
  const look: Theme3D = theme ?? (isTheme3D(root?.theme) ? root.theme : 'cad');
  const given = camera ?? (root?.dim === '3d' ? root.camera : DEFAULT_CAMERA);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { renderer, size } = useSceneRenderer(containerRef, canvasRef, look);
  const view = useOrbit(containerRef, given, size, { enabled: orbit });

  const list = useMemo(() => renderList(doc, root, overrides), [doc, root, overrides]);
  useLayoutEffect(() => {
    if (!renderer || size.width === 0) {
      return;
    }
    renderer.render(list, view, { geometry, effects });
    onFrameDrawn?.(size);
  }, [renderer, list, view, geometry, effects, size, onFrameDrawn]);
  useLayoutEffect(() => renderer?.setGrid(grid), [renderer, grid]);
  useLayoutEffect(() => renderer?.setAxes(axes), [renderer, axes]);

  return (
    <div
      ref={containerRef}
      className={mx(
        'relative dx-fill overflow-hidden bg-(--surface-bg)',
        orbit && 'touch-none cursor-grab',
        classNames,
      )}
      data-testid='scene.3d'
    >
      <canvas ref={canvasRef} className='dx-cover dx-fill block outline-none' />
      {size.width > 0 && <SceneLabels items={list.items} camera={view} viewport={size} theme={look} />}
    </div>
  );
};
