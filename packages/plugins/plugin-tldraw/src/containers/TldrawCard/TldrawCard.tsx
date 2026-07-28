//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type SketchVariantSurfaceProps } from '@dxos/plugin-illustrator/types';
import { Card } from '@dxos/react-ui';

import { CanvasComponent } from '#components';
import { Tldraw } from '#types';

export type TldrawCardProps = SketchVariantSurfaceProps;

export const TldrawCard = ({ canvas, editable = false }: TldrawCardProps) => {
  invariant(Obj.instanceOf(Tldraw.Canvas, canvas));
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
