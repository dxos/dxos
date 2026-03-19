//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type Feed, Filter, Obj, Query } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { useSelected } from '@dxos/react-ui-attention';

import { type ComponentProps } from './types';

export const MessageModule = ({ space }: ComponentProps) => {
  const mailboxes = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const mailbox = mailboxes[0];
  // TODO(wittjosiah): Should be `const feed = useObjectValue(mailbox.feed)`.
  useObject(mailbox);
  const feed = mailbox?.feed?.target as Feed.Feed | undefined;
  const mailboxDxn = mailbox ? Obj.getDXN(mailbox).toString() : undefined;
  const selected = useSelected(mailboxDxn, 'single');
  const message = useQuery(
    space.db,
    feed && selected ? Query.select(Filter.id(selected)).from(feed) : Query.select(Filter.nothing()),
  )[0];
  const data = useMemo(() => ({ subject: message ?? 'message', companionTo: mailbox }), [message, mailbox]);

  return <Surface.Surface role='section' data={data} limit={1} />;
};
