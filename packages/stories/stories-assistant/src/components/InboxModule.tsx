//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { useQuery } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const InboxModule = ({ space }: ComponentProps) => {
  const mailboxes = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const mailbox = mailboxes[0];

  return <Surface.Surface type={AppSurface.Article} data={{ subject: mailbox }} limit={1} />;
};
