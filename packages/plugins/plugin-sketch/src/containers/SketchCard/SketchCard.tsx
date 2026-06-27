//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Card } from '@dxos/react-ui';

import { SketchComponent } from '#components';
import { Sketch } from '#types';

export type SketchCardProps = AppSurface.ObjectCardProps<Sketch.Sketch>;

export const SketchCard = ({ subject }: SketchCardProps) => {
  return (
    <Card.Body>
      <Card.Section classNames='aspect-square'>
        <Card.Row fullWidth>
          <SketchComponent sketch={subject} hideUi autoZoom readonly maxZoom={1} />
        </Card.Row>
      </Card.Section>
    </Card.Body>
  );
};

export default SketchCard;
