//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';

import { type Timeline } from '@dxos/animation';
import { Obj } from '@dxos/echo';
import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { Canvas, createCanvasAtoms, useRegistry } from '@dxos/react-ui-canvas/scene';

import { generatorCompiler, sampleToTimeline, stageEdits } from '#model';

import {
  createGeneratorWorker,
  useBoundCanvasStore,
  useCanvasGenerators,
  useCanvasNodes,
} from '../CanvasArticle/use-canvas-scene.ts';

/**
 * A canvas drawn as an animator stage (plugin-animator F-4.2): the scene engine over the canvas, with the animator's
 * sample applied through the animated projection, so playing never writes the canvas. The canvas's own clock is held
 * at the sample's time for its generators and never plays; an edit made at that time comes back as stage edits.
 */
export const CanvasStage = ({ stage, sample, onFrameDrawn, onEdit }: AnimatorCapabilities.StageProps) => {
  const canvas = Drawing.isCanvas(stage) ? stage : undefined;
  return canvas ? (
    <CanvasStageView canvas={canvas} sample={sample} onFrameDrawn={onFrameDrawn} onEdit={onEdit} />
  ) : null;
};

type CanvasStageViewProps = Pick<AnimatorCapabilities.StageProps, 'sample' | 'onFrameDrawn' | 'onEdit'> & {
  canvas: Drawing.Canvas;
};

const CanvasStageView = ({ canvas, sample, onFrameDrawn, onEdit }: CanvasStageViewProps) => {
  const registry = useRegistry();
  const bound = useBoundCanvasStore(canvas);
  const nodes = useCanvasNodes();
  const generators = useCanvasGenerators(Obj.getDatabase(canvas));
  const atoms = useMemo(() => (bound ? createCanvasAtoms(bound.root) : undefined), [bound]);
  const timeline = useMemo(() => sampleToTimeline(sample), [sample]);
  useLayoutEffect(() => {
    if (atoms) {
      registry.set(atoms.clock.time, sample.t);
    }
  }, [registry, atoms, sample.t]);
  useEffect(() => onFrameDrawn?.(sample.t), [sample.t, onFrameDrawn]);

  const handleTimelineChange = useCallback(
    (next: Timeline) => stageEdits(timeline, next, sample.t).forEach((edit) => onEdit?.(edit)),
    [timeline, sample.t, onEdit],
  );

  if (!bound || !atoms) {
    return null;
  }
  return (
    <Canvas.Root
      key={bound.root}
      store={bound.store}
      root={bound.root}
      atoms={atoms}
      nodes={nodes}
      readonly={!onEdit}
      timeline={timeline}
      onTimelineChange={onEdit ? handleTimelineChange : undefined}
      generators={generators}
      compileGenerator={generatorCompiler}
      createGeneratorWorker={createGeneratorWorker}
      initialDisplay={{ snap: false, guides: false, fit: true }}
    >
      <Canvas.Viewport />
    </Canvas.Root>
  );
};

CanvasStage.displayName = 'CanvasStage';
