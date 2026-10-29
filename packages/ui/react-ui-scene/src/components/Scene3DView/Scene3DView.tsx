//
// Copyright 2026 DXOS.org
//

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { type Instance3D } from '@dxos/animation';
import type * as Util from '@dxos/react-ui/Util';
import { type Scene } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import {
  type GeometrySource,
  SceneLabels,
  SceneRenderer3D,
  type Theme3D,
  isTheme3D,
  renderList,
} from '../../three/index.ts';

export type Scene3DViewProps = Util.ThemedClassName<{
  document: Scene.SceneDocument;
  /** `cad` or `presentation`; the scene's own when unset. */
  theme?: Theme3D;
  /** Where to look; the root scene's camera when unset. */
  camera?: Scene.Camera3D;
  /** Element values that replace the root scene's, as an animation sample does. */
  overrides?: Readonly<Record<string, Partial<Scene.Element3D>>>;
  /** Geometry for items Babylon has no builder for, such as solids. */
  geometry?: GeometrySource;
  effects?: readonly Instance3D[];
  /** Called after each frame is drawn, with the size it was drawn at. */
  onFrameDrawn?: (viewport: { width: number; height: number }) => void;
}>;

/** A CSS colour as `#rrggbb`, resolved through a 2D canvas so any CSS colour form reads. */
const cssColorToHex = (color: string, fallback: string): string => {
  const context = document.createElement('canvas').getContext('2d');
  if (!context || !color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
    return fallback;
  }
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

const DEFAULT_CAMERA: Scene.Camera3D = {
  target: { x: 0, y: 0, z: 0 },
  yaw: -45,
  pitch: 30,
  distance: 10,
  fov: 0.8,
  projection: 'perspective',
};

/** Draws a document's root 3D scene with Babylon, once per change of its inputs, with HTML labels on top. */
export const Scene3DView = ({
  classNames,
  document: doc,
  theme,
  camera,
  overrides,
  geometry,
  effects,
  onFrameDrawn,
}: Scene3DViewProps) => {
  const root = doc.scenes[0];
  const look: Theme3D = theme ?? (isTheme3D(root?.theme) ? root.theme : 'cad');
  const view = camera ?? (root?.dim === '3d' ? root.camera : DEFAULT_CAMERA);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<SceneRenderer3D>();
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }
    const next = new SceneRenderer3D({
      canvas,
      theme: look,
      background: cssColorToHex(getComputedStyle(container).backgroundColor, '#f4f5f7'),
    });
    setRenderer(next);
    const observer = new ResizeObserver(([entry]) => {
      next.resize();
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      next.dispose();
      setRenderer(undefined);
    };
  }, [look]);

  const list = useMemo(() => renderList(doc, overrides), [doc, overrides]);
  useLayoutEffect(() => {
    if (!renderer || size.width === 0) {
      return;
    }
    renderer.render(list, view, { geometry, effects });
    onFrameDrawn?.(size);
  }, [renderer, list, view, geometry, effects, size, onFrameDrawn]);

  return (
    <div
      ref={containerRef}
      className={mx('relative dx-fill overflow-hidden bg-(--surface-bg)', classNames)}
      data-testid='scene.3d'
    >
      <canvas ref={canvasRef} className='dx-cover dx-fill block outline-none' />
      {size.width > 0 && <SceneLabels items={list.items} camera={view} viewport={size} theme={look} />}
    </div>
  );
};
