//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { createLatticeProjection, useRegistry } from '@dxos/react-ui-canvas/scene';

import { canvasRecordOf, updateCanvasRecord } from '#model';
import { Canvas as CanvasFormat } from '#types';

import { SceneArticle } from '../SceneArticle/index.ts';
import { CanvasEngineView } from '../SceneArticle/SceneView2D.tsx';
import { useBoundCanvasStore, useMigratedCanvas } from './use-canvas-scene.ts';

export type CanvasArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps<Obj.Unknown>;

export type LegacyCanvasArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

/** The article surface of the canvas variant: the drawing's `Canvas`, in the scene article. */
export const CanvasArticle = ({ canvas, ...props }: CanvasArticleProps) =>
  CanvasFormat.isCanvas(canvas) ? <SceneArticle {...props} canvas={canvas} /> : null;

CanvasArticle.displayName = 'CanvasArticle';

/**
 * The base canvas of a scene drawing saved before scene canvases: the article opening it moves it onto a `Canvas`
 * (`migrateSceneDrawing`) and shows that; until then, and in a section or slide, which only look at it, it shows the
 * legacy records.
 */
export const LegacyCanvasArticle = ({ canvas, drawing, ...props }: LegacyCanvasArticleProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  const registry = useRegistry();
  const newer = CanvasFormat.isNewerScene(canvas.schema);
  const migrated = useMigratedCanvas(drawing, canvas, props.role === AppSurface.Article.role && !newer);
  const bound = useBoundCanvasStore(canvas);
  const [snapshot, updateCanvas] = useObject(canvas);
  const record = canvasRecordOf(snapshot.content);
  const handleSettingsChange = useCallback(
    (values: Partial<CanvasFormat.CanvasSettings>) =>
      updateCanvas((canvas) => updateCanvasRecord(canvas.content, values)),
    [updateCanvas],
  );
  if (migrated) {
    return <SceneArticle {...props} drawing={drawing} canvas={migrated} />;
  }
  return (
    <CanvasEngineView
      {...props}
      drawing={drawing}
      canvas={canvas}
      registry={registry}
      bound={bound}
      settings={record}
      onSettingsChange={handleSettingsChange}
      createProjection={record?.lattice === true ? createLatticeProjection : undefined}
      newer={newer}
    />
  );
};

LegacyCanvasArticle.displayName = 'LegacyCanvasArticle';
