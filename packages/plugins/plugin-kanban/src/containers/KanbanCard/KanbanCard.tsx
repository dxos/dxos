//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { useObject } from '@dxos/echo-react';
import * as Card from '@dxos/react-ui/Card';

import { type Kanban } from '#types';

/** A kanban's card body: its description alone, since the header already names it and its config is not for reading. */
export const KanbanCard = ({ subject }: AppSurface.ObjectCardProps<Kanban.Kanban>) => {
  const [description] = useObject(subject, 'description');
  return (
    <Card.Body>
      {description && (
        <Card.Row>
          <Card.Text variant='muted' lines={3}>
            {description}
          </Card.Text>
        </Card.Row>
      )}
    </Card.Body>
  );
};

KanbanCard.displayName = 'KanbanCard';
