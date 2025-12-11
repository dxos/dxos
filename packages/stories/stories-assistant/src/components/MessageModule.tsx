//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { Filter, Obj } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { useQuery } from '@dxos/react-client/echo';
import { useSelected } from '@dxos/react-ui-attention';

import { type ComponentProps } from './types';

export const MessageModule = ({ space }: ComponentProps) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const selected = useSelected(Obj.getDXN(mailbox).toString(), 'single');
  const message = useQuery(mailbox?.queue.target, selected ? Filter.id(selected) : Filter.nothing())[0];
  const data = useMemo(() => ({ subject: message ?? 'message', companionTo: mailbox }), [message, mailbox]);

  return <Surface role='section' data={data} limit={1} />;
};
