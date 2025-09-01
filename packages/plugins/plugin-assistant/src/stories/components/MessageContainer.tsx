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

export const MessageContainer = ({ space }: ComponentProps) => {
  const [mailbox] = useQuery(space, Filter.type(Mailbox.Mailbox));
  const state = useCapability(InboxCapabilities.MailboxState);
  const message = mailbox && state[fullyQualifiedId(mailbox)];
  const data = useMemo(() => ({ subject: message ?? 'message', companionTo: mailbox }), [message, mailbox]);

  // TODO(wittjosiah): Fix styles to fill the container.
  return (
    <div className='flex h-[30rem]'>
      <Surface role='article' data={data} limit={1} />
    </div>
  );
};
