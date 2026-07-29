//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type DrawingVariantSurfaceProps } from '@dxos/plugin-illustrator/types';
import { Drawing } from '@dxos/plugin-illustrator/types';
import { Card } from '@dxos/react-ui';

import { CanvasComponent } from '#components';

export type TldrawCardProps = DrawingVariantSurfaceProps;

export const TldrawCard = ({ canvas, editable = false }: TldrawCardProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  return (
    <Card.Body>
      <Card.Section classNames='aspect-square'>
        <Card.Row fullWidth>
          <CanvasComponent canvas={canvas} autoCenter readonly={!editable} hideUi={!editable} />
        </Card.Row>
      </Card.Section>
    </Card.Body>
  );
};

export default TldrawCard;

TldrawCard.displayName = 'TldrawCard';
