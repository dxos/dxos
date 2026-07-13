//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox';
import { type Space, useQuery } from '@dxos/react-client/echo';

export const InboxModule = ({ space }: { space: Space }) => {
  // TODO(burdon): Fix.
  const mailboxes = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const mailbox = mailboxes[0];

  return <Surface.Surface type={AppSurface.Article} data={{ subject: mailbox, attendableId: 'story' }} limit={1} />;
};
