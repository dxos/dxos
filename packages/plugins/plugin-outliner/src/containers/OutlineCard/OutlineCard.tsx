//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit';
import { Card } from '@dxos/react-ui';

import { Outline } from '#components';
import { type Outline as OutlineType } from '#types';

export const OutlineCard = ({ subject }: AppSurface.ObjectProps<OutlineType.Outline>) => {
  if (!subject.content.target) {
    return null;
  }

  return (
    <Outline.Root id={subject.content.target.id} text={subject.content.target}>
      <Card.Root id={subject.id} classNames='p-2'>
        <Outline.Content />
      </Card.Root>
    </Outline.Root>
  );
};
