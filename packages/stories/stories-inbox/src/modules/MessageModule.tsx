//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { GraphPath } from '@dxos/app-toolkit';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Order, Query } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { Mailbox } from '@dxos/plugin-inbox';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { useSelection } from '@dxos/react-ui-attention';
import { Message } from '@dxos/types';

/** The selected thread (companion of the mailbox; tracks the mailbox article's selection). */
export const MessageModule = ({ data }: { data?: { attendableId?: string } }) => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }
  return <MessageModuleContainer space={space} attendableId={data?.attendableId} />;
};

const MessageModuleContainer = ({ space, attendableId }: { space: Space; attendableId?: string }) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const feed = useResolveRef(mailbox?.feed);
  const messages = useQuery(
    space.db,
    feed
      ? Query.select(Filter.type(Message.Message)).from(feed).orderBy(Order.property('created', 'desc'))
      : Query.select(Filter.nothing()),
  );
  // Read the selection under the mailbox object's context (matching MailboxModule), not this cell's
  // positional attendableId — sibling ModuleContainer cells have independent attention targets.
  const selectedId = useSelection(mailbox ? GraphPath.getObjectPathFromObject(mailbox) : attendableId, 'single');
  const selected = messages.find((candidate) => candidate.id === selectedId);
  // Open the whole thread, not just the clicked message — mirrors the app's `mailboxMessage`
  // companion connector: all feed messages sharing the selected message's `threadId`, oldest-first.
  // A message with no `threadId` is its own singleton conversation.
  const thread = useMemo(() => {
    if (!selected) {
      return [];
    }
    const members =
      selected.threadId != null ? messages.filter((message) => message.threadId === selected.threadId) : [selected];
    return [...members].sort((a, b) => (a.created ?? '').localeCompare(b.created ?? ''));
  }, [messages, selected]);
  return thread.length > 0 ? (
    <Surface.Surface
      type={AppSurface.Article}
      data={{ subject: thread, companionTo: mailbox, attendableId }}
      limit={1}
    />
  ) : (
    <div className='h-full grid place-items-center text-description'>Select a message</div>
  );
};
