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
    <div role='none' className='bs-full grid grid-cols-1 grid-rows-[min-content_1fr]'>
      <div role='none' className='grid grid-cols-[1fr_3rem] border-be -mbe-px separator-separator'>
        <Surface role={Role.SEARCH} />
        <Button
          variant='ghost'
          classNames='col-start-2 bs-12 is-12'
          onClick={() => (layout.complementarySidebarOpen = false)}
        >
          <X />
        </Button>
      </div>
      <Surface role={Role.THREAD} />
    </div>
  );
};
