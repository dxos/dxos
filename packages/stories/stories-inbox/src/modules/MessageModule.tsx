//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import { Filter, Order, Query } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { useSelection } from '@dxos/react-ui-attention';
import { Message } from '@dxos/types';

/** The selected thread (companion of the mailbox; tracks the mailbox article's selection). */
export const MessageModule = ({ data }: { data?: { attendableId?: string } }) => {
  const space = Hooks.useActiveSpace();
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
  // The clicked message alone is the subject — `MessageArticle` looks its conversation up by `threadId`
  // against the mailbox passed as `companionTo`. The article's surface filter matches a single non-draft
  // Message, so handing it a thread array resolves no surface at all.
  return selected ? (
    <Surface.Surface
      type={AppSurface.Article}
      data={{ subject: selected, companionTo: mailbox, attendableId }}
      limit={1}
    />
  ) : (
    <div className='h-full grid place-items-center text-fg-muted'>Select a message</div>
  );
};
