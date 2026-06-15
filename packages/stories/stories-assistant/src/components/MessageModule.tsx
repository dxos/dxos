//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Feed, Filter, Obj, Query } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';

import { type ModuleProps } from './types';

export const MessageModule = ({ space }: ModuleProps) => {
  const mailboxes = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  // TODO(wittjosiah): Should be `const feed = useObjectValue(mailbox.feed)`.
  const [mailbox] = useObject(mailboxes[0]);
  const feed = mailbox?.feed?.target as Feed.Feed | undefined;
  const mailboxUri = mailbox ? Obj.getURI(mailbox) : undefined;
  const selected = useSelected(mailboxUri, 'single');
  const message = useQuery(
    space.db,
    feed && selected ? Query.select(Filter.id(selected)).from(feed) : Query.select(Filter.nothing()),
  )[0];
  const data = useMemo(
    () => ({ attendableId: 'story', subject: message ?? 'message', companionTo: mailbox }),
    [message, mailbox],
  );

  return (
    <Panel.Root>
      <Panel.Content>
        <Surface.Surface type={AppSurface.Section} data={data} limit={1} />
      </Panel.Content>
    </Panel.Root>
  );
};
