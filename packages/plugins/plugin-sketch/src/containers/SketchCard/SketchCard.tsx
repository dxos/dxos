//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Card } from '@dxos/react-ui';

import { SketchComponent } from '#components';
import { Sketch } from '#types';

export type SketchCardProps = AppSurface.ObjectCardProps<Sketch.Sketch>;

export const SketchCard = ({ subject, editable = false }: SketchCardProps) => {
  return (
    <Card.Body>
      <Card.Section classNames='aspect-square'>
        <Card.Row fullWidth>
          <SketchComponent sketch={subject} autoZoom maxZoom={1} readonly={!editable} hideUi={!editable} />
        </Card.Row>
      </Card.Section>
    </Card.Body>
  );
};

export default SketchCard;
