//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { mx } from '@dxos/react-ui-theme';

import { ToggleSidebarButton } from './SidebarButton';
import { soloInlinePadding } from '../fragments';

export const ContentEmpty = () => {
  return (
    <div
      role='none'
      className='min-bs-screen is-dvw sm:is-full p-8 grid grid-rows-[var(--rail-size)_1fr]'
      data-testid='layoutPlugin.firstRunMessage'
    >
      <div role='toolbar' className={mx(soloInlinePadding, 'flex items-stretch')}>
        <ToggleSidebarButton />
        <span role='none' className='grow' />
      </div>
      <div role='none' className='grid place-items-center'>
        <Surface role='keyshortcuts' />
      </div>
    </div>
  );
};
