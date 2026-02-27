//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Card } from '@dxos/react-ui-mosaic';

import { Outline } from '../../components/Outline';
import { type Outline as OutlineType } from '../../types';

export const OutlineCard = ({ subject }: SurfaceComponentProps<OutlineType.Outline>) => {
  if (!subject.content.target) {
    return null;
  }

  return (
    <Card.Root id={subject.id} classNames='p-2'>
      <Outline id={subject.content.target.id} text={subject.content.target} />
    </Card.Root>
  );
};
