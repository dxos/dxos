//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { Scene2DView, toViewportDocument } from '@dxos/react-ui-canvas';
import { Scene3DView } from '@dxos/react-ui-canvas/3d';
import * as Card from '@dxos/react-ui/Card';
import { Scene } from '@dxos/scene';

import { canvasDimension, openScene } from '#model';
import { Canvas as CanvasFormat } from '#types';

import { LegacyCanvasView } from '../CanvasArticle/CanvasArticle.tsx';
import { CanvasDatabaseContext } from '../CanvasArticle/CanvasViewNodeView.tsx';
import { useCanvasKinds, useCanvasNodes } from '../CanvasArticle/use-canvas-scene.ts';
import { useSceneDocument } from '../SceneStage/index.ts';

// The view's default fit margin (two major cells a side) would leave a card-sized view mostly empty.
const CARD_MARGIN = 0.25;

export type CanvasCardProps = IllustratorCapabilities.DrawingVariantSurfaceProps<Obj.Unknown>;

/** The card surface of the canvas variant: the drawing's open scene alone, fitted, on the card's own surface. */
export const CanvasCard = ({ canvas }: CanvasCardProps) =>
  CanvasFormat.isCanvas(canvas) ? <DimensionCard canvas={canvas} /> : null;

CanvasCard.displayName = 'CanvasCard';

/** A 3D canvas's card shows its open scene through the 3D renderer; every other one through the 2D engine. */
const DimensionCard = ({ canvas }: { canvas: CanvasFormat.Canvas }) => {
  useObject(canvas);
  return canvasDimension(canvas) === '3d' ? <Scene3DCard canvas={canvas} /> : <SceneCanvasCard canvas={canvas} />;
};

/** The open 3D scene from its authored camera: no grid, and inert, so a press or wheel reaches the card. */
const Scene3DCard = ({ canvas }: { canvas: CanvasFormat.Canvas }) => {
  const scene = openScene(canvas);
  const stored = Obj.instanceOf(Scene.Scene3D, scene) ? scene : undefined;
  const document = useSceneDocument(stored);
  return (
    <Card.Body>
      <Card.Section classNames='aspect-square'>
        {stored && document && (
          <Scene3DView
            classNames='col-[full] pointer-events-none'
            document={document}
            scene={stored.key}
            grid={false}
            orbit={false}
          />
        )}
      </Card.Section>
    </Card.Body>
  );
};

/** The open 2D scene, fitted: the canvas's node types, each layout in its own mode, inert so a press reaches the card. */
const SceneCanvasCard = ({ canvas }: { canvas: CanvasFormat.Canvas }) => {
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
      <Card.Section classNames='aspect-square'>
        {stored && drawn && (
          <CanvasDatabaseContext.Provider value={Obj.getDatabase(canvas)}>
            <Scene2DView
              // Spans the card's rails as well as its content column.
              classNames='col-[full] pointer-events-none'
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

export type LegacyCanvasCardProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

/** The card of a legacy scene drawing: its root scene alone, fitted, as the scene migration reads it. */
export const LegacyCanvasCard = ({ canvas }: LegacyCanvasCardProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  return (
    <Card.Body>
      <Card.Section classNames='aspect-square'>
        <LegacyCanvasView
          // Spans the card's rails as well as its content column; inert, so a press or wheel reaches the card.
          classNames='col-[full] pointer-events-none'
          canvas={canvas}
          margin={CARD_MARGIN}
          grid={false}
        />
      </Card.Section>
    </Card.Body>
  );
};

LegacyCanvasCard.displayName = 'LegacyCanvasCard';
