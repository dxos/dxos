//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { Filter, Type } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { useQuery } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const InboxModule = ({ space }: ComponentProps) => {
  const feeds = useQuery(space.db, Filter.type(Type.Feed));
  const mailbox = feeds.find((feed) => feed.kind === Mailbox.kind);

  return <Surface.Surface role='article' data={{ subject: mailbox }} limit={1} />;
};
