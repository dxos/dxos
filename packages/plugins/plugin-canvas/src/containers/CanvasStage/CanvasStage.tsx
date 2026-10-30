//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { Scene2DView } from '@dxos/react-ui-scene';

import { legacyStageDocument, legacyStageSample } from '#model';

import { applySample, camera2DOf } from '../../model/scene-stage.ts';
import { CanvasDatabaseContext } from '../CanvasArticle/CanvasViewNodeView.tsx';
import { useCanvasNodes } from '../CanvasArticle/use-canvas-scene.ts';

/**
 * A legacy scene canvas drawn as an animator stage (plugin-animator F-4.2): the sample applied to the canvas as the
 * scene migration reads it, drawn read-only, as a migrated canvas's scene stage draws it.
 */
export const CanvasStage = ({ stage, sample, onFrameDrawn }: AnimatorCapabilities.StageProps) => {
  const canvas = Drawing.isCanvas(stage) ? stage : undefined;
  return canvas ? <CanvasStageView canvas={canvas} sample={sample} onFrameDrawn={onFrameDrawn} /> : null;
};

CanvasStage.displayName = 'CanvasStage';

type CanvasStageViewProps = Pick<AnimatorCapabilities.StageProps, 'sample' | 'onFrameDrawn'> & {
  canvas: Drawing.Canvas;
};

const CanvasStageView = ({ canvas, sample, onFrameDrawn }: CanvasStageViewProps) => {
  const nodes = useCanvasNodes();
  const [snapshot] = useObject(canvas);
  // Read again whenever the canvas's records change.
  const document = useMemo(() => legacyStageDocument(canvas), [canvas, snapshot]);
  const sampled = useMemo(
    () => (document ? applySample(document, legacyStageSample(sample)) : undefined),
    [document, sample],
  );
  useEffect(() => onFrameDrawn?.(sample.t), [sample.t, onFrameDrawn]);

  const root = sampled?.scenes[0];
  if (!sampled || root?.dim !== '2d') {
    return null;
  }
  // A legacy shot with no camera keys frames the whole drawing, as the canvas did.
  const keyed = sample.camera !== undefined && Object.keys(sample.camera).length > 0;
  return (
    <CanvasDatabaseContext.Provider value={Obj.getDatabase(canvas)}>
      <Scene2DView document={sampled} camera={keyed ? camera2DOf(root.camera, sample.camera) : 'fit'} nodes={nodes} />
    </CanvasDatabaseContext.Provider>
  );
};
