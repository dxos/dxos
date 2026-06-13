//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox';
import { useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { type ModuleProps } from './types';

export const InboxModule = ({ space }: ModuleProps) => {
  const mailboxes = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const mailbox = mailboxes[0];

  return (
    <Panel.Root>
      <Panel.Content>
        <Surface.Surface type={AppSurface.Article} data={{ subject: mailbox, attendableId: 'story' }} limit={1} />
      </Panel.Content>
    </Panel.Root>
  );
};
