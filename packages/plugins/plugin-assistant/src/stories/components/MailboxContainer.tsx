//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { Filter } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { useQuery } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const MailboxContainer = ({ space }: ComponentProps) => {
  const [mailbox] = useQuery(space, Filter.type(Mailbox.Mailbox));
  const data = useMemo(() => ({ subject: mailbox }), [mailbox]);

  // TODO(wittjosiah): Fix styles to fill the container.
  return (
    <div className='flex h-[30rem]'>
      <Surface role='article' data={data} limit={1} />
    </div>
  );
};
