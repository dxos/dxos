//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { Scene2DView } from '@dxos/react-ui-canvas';
import * as Banner from '@dxos/react-ui/Banner';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import type * as Util from '@dxos/react-ui/Util';

import { canvasRecordOf, legacyDocument, readStyles } from '#model';
import { Canvas as CanvasFormat } from '#types';

import { CanvasNamespace } from '../../namespace.ts';
import { SceneArticle } from '../SceneArticle/index.ts';
import { CanvasDatabaseContext } from './CanvasViewNodeView.tsx';
import { useCanvasNodes, useMigratedCanvas } from './use-canvas-scene.ts';

export type CanvasArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps<Obj.Unknown>;

export type LegacyCanvasArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

/** The article surface of the canvas variant: the drawing's `Canvas`, in the scene article. */
export const CanvasArticle = ({ canvas, ...props }: CanvasArticleProps) =>
  CanvasFormat.isCanvas(canvas) ? <SceneArticle {...props} canvas={canvas} /> : null;

CanvasArticle.displayName = 'CanvasArticle';

/** Why a canvas a newer plugin saved opens read-only, and what unlocks it. */
const NewerFormatBanner = () => {
  const { t } = UiHooks.useTranslation(CanvasNamespace.key);
  return (
    <Banner.Root valence='warning' data-testid='canvas.newer-format'>
      <Banner.Title>{t('newer-format.title')}</Banner.Title>
      <Banner.Body>{t('newer-format.message')}</Banner.Body>
    </Banner.Root>
  );
};

export type LegacyCanvasViewProps = Util.ThemedClassName<{
  canvas: Drawing.Canvas;
  /** The room a fit leaves around the drawing; the view's default when unset. */
  margin?: number;
  /** Whether the grid is drawn. */
  grid?: boolean;
  /** Draws no surface under the drawing, so a slide shows through. */
  transparent?: boolean;
}>;

/**
 * A legacy scene drawing read through the scene migration (`legacyDocument`) without writing it, drawn read-only: what
 * every surface but the writable article shows, so nothing but the migration reads the legacy records.
 */
export const LegacyCanvasView = ({ classNames, canvas, margin, grid, transparent }: LegacyCanvasViewProps) => {
  const nodes = useCanvasNodes();
  const [snapshot] = useObject(canvas);
  const document = useMemo(
    () => legacyDocument(snapshot.content, readStyles(snapshot.styles)),
    [snapshot.content, snapshot.styles],
  );
  return (
    <CanvasDatabaseContext.Provider value={Obj.getDatabase(canvas)}>
      <Scene2DView
        classNames={classNames}
        document={document}
        theme={canvasRecordOf(snapshot.content)?.theme}
        nodes={nodes}
        margin={margin}
        grid={grid}
        transparent={transparent}
      />
    </CanvasDatabaseContext.Provider>
  );
};

LegacyCanvasView.displayName = 'LegacyCanvasView';

/**
 * The base canvas of a scene drawing saved before scene canvases: the article opening it moves it onto a `Canvas`
 * (`migrateSceneDrawing`) and shows that; until then, in a section or slide, which only look at it, and for a drawing a
 * newer plugin saved, it shows the drawing as the migration reads it.
 */
export const LegacyCanvasArticle = ({ canvas, drawing, ...props }: LegacyCanvasArticleProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  const newer = CanvasFormat.isNewerScene(canvas.schema);
  const article = props.role === AppSurface.Article.role;
  const migrated = useMigratedCanvas(drawing, canvas, article && !newer);
  if (migrated) {
    return <SceneArticle {...props} drawing={drawing} canvas={migrated} />;
  }
  const section = props.role === AppSurface.Section.role;
  const slide = props.role === AppSurface.Slide.role;
  return (
    // A section takes the document's width and has no height of its own, so its height follows from a 3:2 frame.
    <Panel.Root role={props.role} classNames={section ? 'w-full aspect-[3/2]' : slide ? 'bg-transparent' : undefined}>
      {newer && article && (
        <Panel.Header>
          <NewerFormatBanner />
        </Panel.Header>
      )}
      <Panel.Body>
        <LegacyCanvasView canvas={canvas} margin={slide ? 0 : undefined} grid={article} transparent={slide} />
      </Panel.Body>
    </Panel.Root>
  );
};

LegacyCanvasArticle.displayName = 'LegacyCanvasArticle';
