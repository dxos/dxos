//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Card, Show } from '@dxos/react-ui';
import { type Outline as OutlineType } from '@dxos/types';

import { Outline } from '#components';

export type OutlineCardProps = AppSurface.ObjectCardProps<OutlineType.Outline>;

export const OutlineCard = ({ subject }: OutlineCardProps) => {
  // `.target` below is synchronous and non-reactive, so subscribing to the ref is what re-renders the
  // card once it resolves; the editor still needs the live object, which `.target` then yields.
  useObject(subject.content);

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
