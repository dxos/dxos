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
    // Read-only: a card is a preview, so no editing, no drag grips, and no floating menu.
    <Outline.Root id={subject.content.target.id} text={subject.content.target} readonly>
      <Card.Body>
        <Card.Row>
          <Outline.Content />
        </Card.Row>
      </Card.Body>
    </Outline.Root>
  );
};

OutlineCard.displayName = 'OutlineCard';
