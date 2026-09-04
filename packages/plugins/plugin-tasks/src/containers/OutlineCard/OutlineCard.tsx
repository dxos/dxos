//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card, Show } from '@dxos/react-ui';
import { type Outline as OutlineType } from '@dxos/types';

import { Outline } from '#components';

export type OutlineCardProps = AppSurface.ObjectCardProps<OutlineType.Outline>;

export const OutlineCard = ({ subject }: OutlineCardProps) => {
  return (
    <Show when={subject.content.target}>
      {(text) => (
        // Read-only: a card is a preview, so no editing, no drag grips, and no floating menu.
        <Outline.Root id={text.id} text={text} readonly>
          <Card.Body>
            <Card.Row>
              <Outline.Content />
            </Card.Row>
          </Card.Body>
        </Outline.Root>
      )}
    </Show>
  );
};

OutlineCard.displayName = 'OutlineCard';
