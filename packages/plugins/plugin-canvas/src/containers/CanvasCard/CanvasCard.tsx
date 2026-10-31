//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { Scene2DView, toViewportDocument } from '@dxos/react-ui-canvas';
import { Scene3DView } from '@dxos/react-ui-canvas/3d';
import * as Card from '@dxos/react-ui/Card';
import { Scene } from '@dxos/scene';

import { canvasDimension, openScene } from '#model';
import { Canvas as CanvasFormat } from '#types';

import { CanvasDatabaseContext } from '../CanvasArticle/CanvasViewNodeView.tsx';
import { useCanvasKinds, useCanvasNodes } from '../CanvasArticle/use-canvas-scene.ts';
import { useSceneDocument } from '../CanvasStage/index.ts';

// The view's default fit margin (two major cells a side) would leave a card-sized view mostly empty.
const CARD_MARGIN = 0.25;

export type CanvasCardProps = IllustratorCapabilities.DrawingVariantSurfaceProps<Obj.Unknown>;

/** The card surface of the canvas variant: the drawing's open scene alone, fitted, on the card's own surface. */
export const CanvasCard = ({ canvas, extrinsic }: CanvasCardProps) =>
  CanvasFormat.isCanvas(canvas) ? <DimensionCard canvas={canvas} extrinsic={extrinsic} /> : null;

CanvasCard.displayName = 'CanvasCard';

type DimensionCardProps = { canvas: CanvasFormat.Canvas; extrinsic?: boolean };

/** A 3D canvas's card shows its open scene through the 3D renderer; every other one through the 2D engine. */
const DimensionCard = ({ canvas, extrinsic }: DimensionCardProps) => {
  useObject(canvas);
  return canvasDimension(canvas) === '3d' ? (
    <Canvas3DCard canvas={canvas} extrinsic={extrinsic} />
  ) : (
    <Canvas2DCard canvas={canvas} extrinsic={extrinsic} />
  );
};

/**
 * A card sized by its host covers the host's positioned box (a canvas frame), since the card's own rows size to their
 * content; it is then out of the card's grid, so neither it nor the view takes the card's column lines. One in a list
 * or grid is a square spanning the card's rails as well as its content column.
 */
const cardClassNames = (extrinsic?: boolean) =>
  extrinsic
    ? { section: 'dx-cover col-auto', view: 'col-auto pointer-events-none' }
    : { section: 'aspect-square', view: 'col-[full] pointer-events-none' };

/** The open 3D scene from its authored camera: no grid, and inert, so a press or wheel reaches the card. */
const Canvas3DCard = ({ canvas, extrinsic }: DimensionCardProps) => {
  const classNames = cardClassNames(extrinsic);
  const scene = openScene(canvas);
  const stored = Obj.instanceOf(Scene.Scene3D, scene) ? scene : undefined;
  const document = useSceneDocument(stored);
  return (
    <Card.Body>
      <Card.Section classNames={classNames.section}>
        {stored && document && (
          <Scene3DView classNames={classNames.view} document={document} scene={stored.key} grid={false} orbit={false} />
        )}
      </Card.Section>
    </Card.Body>
  );
};

/** The open 2D scene, fitted: the canvas's node types, each layout in its own mode, inert so a press reaches the card. */
const Canvas2DCard = ({ canvas, extrinsic }: DimensionCardProps) => {
  const classNames = cardClassNames(extrinsic);
  const nodes = useCanvasNodes();
  const kinds = useCanvasKinds();
  const [snapshot] = useObject(canvas);
  const scene = openScene(canvas);
  const stored = Obj.instanceOf(Scene.Scene2D, scene) ? scene : undefined;
  const document = useSceneDocument(stored);
  // The view draws a kind's element from its canvas fields, as the article's viewport does.
  const drawn = useMemo(() => document && toViewportDocument(document, kinds), [document, kinds]);
  return (
    <Card.Body>
      <Card.Section classNames={classNames.section}>
        {stored && drawn && (
          <CanvasDatabaseContext.Provider value={Obj.getDatabase(canvas)}>
            <Scene2DView
              classNames={classNames.view}
              document={drawn}
              scene={stored.key}
              theme={snapshot.settings.theme}
              nodes={nodes}
              margin={CARD_MARGIN}
              grid={false}
            />
          </CanvasDatabaseContext.Provider>
        )}
      </Card.Section>
    </Card.Body>
  );
};
