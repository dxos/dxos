//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { Kanban as KanbanType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { SpaceProxy } from '@dxos/client';

export const ThreadMain: FC<{ data: [SpaceProxy, KanbanType] }> = ({ data }) => {
  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh] overflow-hidden bg-white dark:bg-neutral-925'>
      <div>THREAD</div>
    </Main.Content>
  );
};
