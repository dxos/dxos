//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card } from '@dxos/react-ui';

import { Outline as OutlineComponent } from '#components';

import type * as Outline from '../../types/Outline';

export type OutlineCardProps = AppSurface.ObjectCardProps<Outline.Outline>;

export const OutlineCard = ({ subject }: OutlineCardProps) => {
  if (!subject.content.target) {
    return null;
  }

  return (
    <OutlineComponent.Root id={subject.content.target.id} text={subject.content.target}>
      <Card.Root id={subject.id} classNames='p-2'>
        <OutlineComponent.Content />
      </Card.Root>
    </OutlineComponent.Root>
  );
};

OutlineCard.displayName = 'OutlineCard';
