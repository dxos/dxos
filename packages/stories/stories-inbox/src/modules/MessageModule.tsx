//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Order, Query } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { Mailbox } from '@dxos/plugin-inbox';
import { useQuery } from '@dxos/react-client/echo';
import { useSelection } from '@dxos/react-ui-attention';
import { type ModuleProps } from '@dxos/story-modules';
import { Message } from '@dxos/types';

/** The selected message (companion of the mailbox; tracks the mailbox article's selection). */
export const MessageModule = ({ space, attendableId }: ModuleProps) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const feed = useResolveRef(mailbox?.feed);
  const messages = useQuery(
    space.db,
    feed
      ? Query.select(Filter.type(Message.Message)).from(feed).orderBy(Order.property('created', 'desc'))
      : Query.select(Filter.nothing()),
  );
  const selectedId = useSelection(attendableId, 'single');
  const message = messages.find((candidate) => candidate.id === selectedId);
  return message ? (
    <Surface.Surface
      type={AppSurface.Article}
      data={{ subject: message, companionTo: mailbox, attendableId }}
      limit={1}
    />
  ) : (
    <div className='h-full grid place-items-center text-description'>Select a message</div>
  );
};
