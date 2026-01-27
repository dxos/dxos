//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { Filter } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { useQuery } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const InboxModule = ({ space }: ComponentProps) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const data = useMemo(() => ({ subject: mailbox }), [mailbox]);

  return <Surface role='article' data={{ subject: mailbox }} limit={1} />;
};
