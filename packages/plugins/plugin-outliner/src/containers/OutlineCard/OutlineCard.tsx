//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card } from '@dxos/react-ui';

import { Outline } from '#components';
import { type Outline as OutlineType } from '#types';

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
