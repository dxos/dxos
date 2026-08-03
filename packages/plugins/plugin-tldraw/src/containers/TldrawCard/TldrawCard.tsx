//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { Card } from '@dxos/react-ui';

import { CanvasComponent } from '#components';

export type TldrawCardProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

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
