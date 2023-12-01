//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { groupSurface, mx } from '@dxos/react-ui-theme';

enum Role {
  SEARCH = 'context-search',
  THREAD = 'context-thread',
}

export const ContextPanel = () => {
  return (
    <div className={mx('flex flex-col h-full overflow-hidden', groupSurface)}>
      <div className='flex shrink-0 overflow-hidden'>
        <Surface role={Role.SEARCH} />
      </div>
      <div className='flex flex-1 overflow-hidden'>
        <Surface role={Role.THREAD} />
      </div>
    </div>
  );
};
