//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';

import { Scene } from '#types';

import { cameraOf, defaultCamera, projectSphere, radiusOf, sceneObjects, sceneState } from '../../animator/index.ts';
import { StageRenderer, instanceItems } from './renderer.ts';
import { StageLabels } from './StageLabels.tsx';

/** A CSS colour as `#rrggbb`, resolved through a 2D canvas so any CSS colour form (oklch, rgb) reads. */
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

/**
 * A spacetime scene drawn as an animator stage (plugin-animator F-4.3): Babylon renders the scene at the sample's values
 * once per sample, with the `3d` effect frames as instanced meshes and labels beside the objects, and reports the frame
 * and where each object is on screen. Read-only: it never writes the scene.
 */
export const SpacetimeStage = ({
  stage,
  sample,
  effects,
  onFrameDrawn,
  onProjection,
}: AnimatorCapabilities.StageProps) =>
  Obj.instanceOf(Scene.Scene, stage) ? (
    <SpacetimeStageView
      // A change of look rebuilds the renderer with the other materials and lights.
      key={stage.style ?? 'cad'}
      scene={stage}
      sample={sample}
      effects={effects}
      onFrameDrawn={onFrameDrawn}
      onProjection={onProjection}
    />
  ) : null;

type SpacetimeStageViewProps = Pick<
  AnimatorCapabilities.StageProps,
  'sample' | 'effects' | 'onFrameDrawn' | 'onProjection'
> & {
  scene: Scene.Scene;
};

const SpacetimeStageView = ({ scene, sample, effects, onFrameDrawn, onProjection }: SpacetimeStageViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<StageRenderer>();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const presentation = scene.style === 'presentation';

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }
    const next = new StageRenderer({
      canvas,
      presentation,
      background: cssColorToHex(getComputedStyle(container).backgroundColor, '#f7f7f7'),
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
  }, [presentation]);

  const states = useMemo(() => sceneState(scene, sample), [scene, sample]);
  const aspect = size.height > 0 ? size.width / size.height : undefined;
  const camera = useMemo(() => cameraOf(sample.camera, defaultCamera(scene, aspect)), [scene, sample.camera, aspect]);
  const items = useMemo(() => instanceItems(effects), [effects]);
  const rests = useMemo(
    () => new Map(sceneObjects(scene).map((object) => [object.id, radiusOf(object.scale)])),
    [scene],
  );
  const anchors = useMemo(() => {
    if (size.width === 0 || size.height === 0) {
      return {};
    }
    return Object.fromEntries(
      states.flatMap((state) => {
        const anchor = projectSphere(camera, size, state.position, state.radius);
        return anchor ? [[state.id, anchor] as const] : [];
      }),
    );
  }, [states, camera, size]);

  // Drawn once per sample, after layout, so the frame on screen is the one for the sample's time (F-6.2).
  useLayoutEffect(() => {
    if (!renderer || size.width === 0) {
      return;
    }
    renderer.render(scene, states, camera, items);
    onFrameDrawn?.(sample.t);
  }, [renderer, scene, states, camera, items, size, sample.t, onFrameDrawn]);

  useEffect(() => {
    if (onProjection && size.width > 0) {
      onProjection({ t: sample.t, anchors });
    }
  }, [onProjection, anchors, sample.t, size.width]);

  return (
    <div
      ref={containerRef}
      className='relative dx-fill overflow-hidden bg-(--surface-bg)'
      data-testid='spacetime.stage'
      data-frame-time={sample.t.toFixed(4)}
    >
      <canvas ref={canvasRef} className='dx-cover dx-fill block outline-none' />
      <StageLabels states={states} anchors={anchors} rests={rests} />
    </div>
  );
};

SpacetimeStage.displayName = 'SpacetimeStage';
