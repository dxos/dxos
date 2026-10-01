//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { Next } from '@dxos/react-ui/next';

import { CanvasComponent } from '#components';

export type TldrawCardProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

export const TldrawCard = ({ canvas, editable = false }: TldrawCardProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  return (
    <Next.Card.Body>
      <Next.Card.Section classNames='aspect-square'>
        <Next.Card.Row fullWidth>
          <CanvasComponent canvas={canvas} autoCenter readonly={!editable} hideUi={!editable} />
        </Next.Card.Row>
      </Next.Card.Section>
    </Next.Card.Body>
  );
};

export default TldrawCard;

TldrawCard.displayName = 'TldrawCard';
