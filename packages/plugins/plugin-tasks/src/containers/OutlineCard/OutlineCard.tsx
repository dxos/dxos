//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card } from '@dxos/react-ui';
import { type Outline as OutlineType } from '@dxos/types';

import { Outline } from '#components';

export type OutlineCardProps = AppSurface.ObjectCardProps<OutlineType.Outline>;

export const OutlineCard = ({ subject }: OutlineCardProps) => {
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

OutlineCard.displayName = 'OutlineCard';
