//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { useQuery } from '@dxos/react-client/echo';
import { useSelected } from '@dxos/react-ui-attention';

import { type ComponentProps } from './types';

export const MessageModule = ({ space }: ComponentProps) => {
  const feeds = useQuery(space.db, Filter.type(Type.Feed));
  const mailbox = feeds.find((feed) => feed.kind === Mailbox.kind);
  const mailboxDxn = mailbox ? Obj.getDXN(mailbox).toString() : undefined;
  const selected = useSelected(mailboxDxn, 'single');
  const message = useQuery(
    space.db,
    mailbox && selected ? Query.select(Filter.id(selected)).from(mailbox) : Query.select(Filter.nothing()),
  )[0];
  const data = useMemo(() => ({ subject: message ?? 'message', companionTo: mailbox }), [message, mailbox]);

  return <Surface.Surface role='section' data={data} limit={1} />;
};
