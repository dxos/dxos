//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';

import { type Timeline } from '@dxos/animation';
import { Obj } from '@dxos/echo';
import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import {
  Canvas,
  type CanvasAtoms,
  ShapeLayer,
  createCanvasAtoms,
  sceneToScreen,
  useRegistry,
} from '@dxos/react-ui-canvas/scene';

import { canvasStageBinding, generatorCompiler, sampleToTimeline, stageEdits } from '#model';

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
export const CanvasStage = ({
  stage,
  sample,
  effects,
  onFrameDrawn,
  onEdit,
  onProjection,
}: AnimatorCapabilities.StageProps) => {
  const canvas = Drawing.isCanvas(stage) ? stage : undefined;
  return canvas ? (
    <CanvasStageView
      canvas={canvas}
      sample={sample}
      effects={effects}
      onFrameDrawn={onFrameDrawn}
      onEdit={onEdit}
      onProjection={onProjection}
    />
  ) : null;
};

type CanvasStageViewProps = Pick<
  AnimatorCapabilities.StageProps,
  'sample' | 'effects' | 'onFrameDrawn' | 'onEdit' | 'onProjection'
> & {
  canvas: Drawing.Canvas;
};

const CanvasStageView = ({ canvas, sample, effects, onFrameDrawn, onEdit, onProjection }: CanvasStageViewProps) => {
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

  // The animator's `2d` effects draw in scene coordinates under the camera, above the scene.
  const shapes = useMemo(() => effects.flatMap((frame) => (frame.renderer === '2d' ? frame.items : [])), [effects]);

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
      <Canvas.Viewport
        overlay={shapes.length > 0 ? <ShapeLayer t={sample.t} shapes={shapes} testId='animator-effects' /> : undefined}
      />
      {onProjection && <StageProjector canvas={canvas} sample={sample} atoms={atoms} onProjection={onProjection} />}
    </Canvas.Root>
  );
};

type StageProjectorProps = Pick<CanvasStageViewProps, 'canvas' | 'sample'> & {
  atoms: CanvasAtoms;
  onProjection: NonNullable<AnimatorCapabilities.StageProps['onProjection']>;
};

/** Reports where the sampled nodes are on screen through the camera, for the animator's overlay effects. */
const StageProjector = ({ canvas, sample, atoms, onProjection }: StageProjectorProps) => {
  const camera = useAtomValue(atoms.camera);
  useEffect(() => {
    const { objects } = canvasStageBinding(canvas, sample);
    const anchors = Object.fromEntries(
      Object.values(objects).map((object) => {
        const { x, y } = sceneToScreen(camera, object.position);
        return [object.id, { x, y, radius: object.radius * camera.zoom }];
      }),
    );
    onProjection({ t: sample.t, anchors });
  }, [canvas, sample, camera, onProjection]);
  return null;
};

CanvasStage.displayName = 'CanvasStage';
