//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import {
  Canvas,
  type NodeRegistry,
  type ViewId,
  type ViewStore,
  createLatticeProjection,
} from '@dxos/react-ui-canvas/scene';
import * as Card from '@dxos/react-ui/Card';

import { canvasRecordOf } from '#model';
import { Canvas as CanvasFormat } from '#types';

import { CanvasDatabaseContext } from '../CanvasArticle/CanvasViewNodeView.tsx';
import { useBoundCanvasStore, useBoundLayoutStore, useCanvasNodes } from '../CanvasArticle/use-canvas-scene.ts';

// A card is a preview: only the drawing, fitted, with no grid or guides.
const CARD_DISPLAY = { snap: false, guides: false, fit: true };

// The view's default fit margin (two major cells a side) would leave a card-sized view mostly empty.
const CARD_MARGIN = 0.25;

export type CanvasCardProps = IllustratorCapabilities.DrawingVariantSurfaceProps<Obj.Unknown>;

/** The card surface of the canvas variant: the drawing's open scene alone, fitted, on the card's own surface. */
export const CanvasCard = ({ canvas }: CanvasCardProps) =>
  CanvasFormat.isCanvas(canvas) ? <SceneCanvasCard canvas={canvas} /> : null;

CanvasCard.displayName = 'CanvasCard';

const SceneCanvasCard = ({ canvas }: { canvas: CanvasFormat.Canvas }) => {
  const nodes = useCanvasNodes();
  const bound = useBoundLayoutStore(canvas);
  const [snapshot] = useObject(canvas);
  return (
    <CardView
      db={Obj.getDatabase(canvas)}
      bound={bound}
      nodes={nodes}
      lattice={CanvasFormat.projectionOf(snapshot.settings) === 'lattice'}
      grid={snapshot.settings.grid}
    />
  );
};

type CardViewProps = {
  db: ReturnType<typeof Obj.getDatabase>;
  bound: { store: ViewStore; root: ViewId } | undefined;
  nodes: NodeRegistry;
  lattice: boolean;
  grid: number | undefined;
};

const CardView = ({ db, bound, nodes, lattice, grid }: CardViewProps) => (
  <Card.Body>
    <Card.Section classNames='aspect-square'>
      {bound && (
        <CanvasDatabaseContext.Provider value={db}>
          <Canvas.Root
            key={bound.root}
            // Spans the card's rails as well as its content column; inert, so a press or wheel reaches the card rather
            // than panning the drawing.
            classNames='col-[full] bg-transparent pointer-events-none'
            store={bound.store}
            root={bound.root}
            nodes={nodes}
            createProjection={lattice ? createLatticeProjection : undefined}
            grid={grid}
            margin={CARD_MARGIN}
            readonly
            initialDisplay={CARD_DISPLAY}
          >
            <Canvas.Viewport liveDepth={0} />
          </Canvas.Root>
        </CanvasDatabaseContext.Provider>
      )}
    </Card.Section>
  </Card.Body>
);

export type LegacyCanvasCardProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

/** The card of a legacy scene drawing: its root scene alone, fitted, read from its records. */
export const LegacyCanvasCard = ({ canvas }: LegacyCanvasCardProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  const nodes = useCanvasNodes();
  const bound = useBoundCanvasStore(canvas);
  const [snapshot] = useObject(canvas);
  const record = canvasRecordOf(snapshot.content);

  return (
    <Card.Body>
      <Card.Section classNames='aspect-square'>
        {bound && (
          <CanvasDatabaseContext.Provider value={Obj.getDatabase(canvas)}>
            <Canvas.Root
              key={bound.root}
              // Spans the card's rails as well as its content column; inert, so a press or wheel reaches the card rather
              // than panning the drawing.
              classNames='col-[full] bg-transparent pointer-events-none'
              store={bound.store}
              root={bound.root}
              nodes={nodes}
              createProjection={record?.lattice === true ? createLatticeProjection : undefined}
              grid={record?.grid}
              margin={CARD_MARGIN}
              readonly
              initialDisplay={CARD_DISPLAY}
            >
              <Canvas.Viewport liveDepth={0} />
            </Canvas.Root>
          </CanvasDatabaseContext.Provider>
        )}
      </Card.Section>
    </Card.Body>
  );
};

LegacyCanvasCard.displayName = 'LegacyCanvasCard';
