//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { getLinkedVariant, linkedSegment } from '@dxos/react-ui-attention';

const automationCompanionId = linkedSegment('automation');

/**
 * Per-object routines companion for the story mailbox — mirrors the deck automation companion panel.
 */
export const RoutineCompanionModule = ({ space }: { space: Space }) => {
  const mailboxes = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const mailbox = mailboxes[0];
  if (!mailbox) {
    return null;
  }

  return (
    <Surface.Surface
      type={AppSurface.Article}
      data={{
        attendableId: mailbox.id,
        subject: 'automation',
        companionTo: mailbox,
        variant: getLinkedVariant(automationCompanionId),
      }}
      limit={1}
    />
  );
};
