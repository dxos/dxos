//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React from 'react';

import { Surface } from '@dxos/app-framework';
import { Button } from '@dxos/react-ui';

import { useLayout } from '../LayoutContext';

enum Role {
  SEARCH = 'context-search',
  THREAD = 'context-thread',
}

export const ContextPanel = () => {
  const layout = useLayout();
  return (
    <div className='bs-full overflow-y-auto'>
      <div className='grid grid-cols-[1fr_3rem]'>
        <Surface role={Role.SEARCH} />
        <Button variant='ghost' onClick={() => (layout.complementarySidebarOpen = false)}>
          <X />
        </Button>
      </div>
      <Surface role={Role.THREAD} />
    </div>
  );
};
