//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';

enum Role {
  SEARCH = 'context-search',
  THREAD = 'context-thread',
}

export const ContextPanel = () => {
  // TODO(burdon): Collapse search unless focused?
  return (
    <div className='flex flex-col h-full overflow-hidden'>
      <div className='flex shrink-0 overflow-hidden'>
        <Surface role={Role.SEARCH} />
      </div>
      <div className='flex overflow-hidden'>
        <Surface role={Role.THREAD} />
      </div>
    </div>
  );
};
