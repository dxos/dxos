//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { SceneView, createLatticeProjection } from '@dxos/react-ui-canvas/scene';
import * as Card from '@dxos/react-ui/Card';

import { canvasRecordOf } from '#model';

import { CanvasDatabaseContext } from '../CanvasArticle/CanvasFrameNodeView.tsx';
import { useBoundCanvasStore, useCanvasNodes } from '../CanvasArticle/use-canvas-scene.ts';

// A card is a preview: only the drawing, fitted, with no grid or guides.
const CARD_DISPLAY = { snap: false, guides: false, fit: true };

// The view's default fit margin (two major cells a side) would leave a card-sized view mostly empty.
const CARD_MARGIN = 0.25;

export type CanvasCardProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

/** The card surface of the canvas variant: the drawing's root scene alone, fitted, on the card's own surface. */
export const CanvasCard = ({ canvas }: CanvasCardProps) => {
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
            <SceneView.Root
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
              <SceneView.Canvas liveDepth={0} />
            </SceneView.Root>
          </CanvasDatabaseContext.Provider>
        )}
      </Card.Section>
    </Card.Body>
  );
};

CanvasCard.displayName = 'CanvasCard';
