//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface, useCapability } from '@dxos/app-framework';
import { Filter } from '@dxos/echo';
import { InboxCapabilities } from '@dxos/plugin-inbox';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { fullyQualifiedId, useQuery } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const MessageModule = ({ space }: ComponentProps) => {
  const [mailbox] = useQuery(space, Filter.type(Mailbox.Mailbox));
  const state = useCapability(InboxCapabilities.MailboxState);
  const message = mailbox && state[fullyQualifiedId(mailbox)];
  const data = useMemo(() => ({ subject: message ?? 'message', companionTo: mailbox }), [message, mailbox]);

  return <Surface role='section' data={data} limit={1} />;
};
