//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo } from 'react';

import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import { Scene2DView, Scene3DView, project, renderList } from '@dxos/react-ui-scene';

import { applySample, camera2DOf, camera3DOf } from '../../model/scene-stage.ts';
import { useSceneDocument } from './use-scene-document.ts';

/**
 * A scene (`@dxos/scene`) drawn as an animator stage: the sample's values are applied to a copy of the scene, which
 * the 2D or 3D view draws read-only; the 3D stage also reports where its elements are for overlay effects.
 */
export const SceneStage = ({ stage, sample, effects, onFrameDrawn, onProjection }: AnimatorCapabilities.StageProps) => {
  const document = useSceneDocument(stage);
  const sampled = useMemo(() => (document ? applySample(document, sample) : undefined), [document, sample]);
  const root = sampled?.scenes[0];
  const items3d = useMemo(() => effects.flatMap((frame) => (frame.renderer === '3d' ? frame.items : [])), [effects]);

  useEffect(() => {
    if (root?.dim === '2d') {
      onFrameDrawn?.(sample.t);
    }
  }, [root?.dim, sample.t, onFrameDrawn]);

  const camera3d = useMemo(
    () => (root?.dim === '3d' ? camera3DOf(root.camera, sample.camera) : undefined),
    [root, sample.camera],
  );
  const handleFrameDrawn = useCallback(
    (viewport: { width: number; height: number }) => {
      onFrameDrawn?.(sample.t);
      if (onProjection && sampled && camera3d) {
        const anchors = Object.fromEntries(
          renderList(sampled).items.flatMap((item) => {
            const anchor =
              item.key === item.id &&
              project(camera3d, viewport, item.position, Math.max(item.scale.x, item.scale.y, item.scale.z) / 2);
            return anchor ? [[item.id, anchor] as const] : [];
          }),
        );
        onProjection({ t: sample.t, anchors });
      }
    },
    [onFrameDrawn, onProjection, sampled, camera3d, sample.t],
  );

  if (!sampled || !root) {
    return null;
  }
  return root.dim === '2d' ? (
    <Scene2DView document={sampled} camera={camera2DOf(root.camera, sample.camera)} />
  ) : (
    <Scene3DView document={sampled} camera={camera3d} effects={items3d} onFrameDrawn={handleFrameDrawn} />
  );
};
