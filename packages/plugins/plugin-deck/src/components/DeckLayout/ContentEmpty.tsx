//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { mx } from '@dxos/react-ui-theme';

import { ToggleSidebarButton } from './SidebarButton';
import { layoutAppliesTopbar, useBreakpoints } from '../../util';
import { soloInlinePadding } from '../fragments';

export const ContentEmpty = () => {
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint);
  return (
    <div
      role='none'
      className={mx(
        'min-bs-screen is-dvw sm:is-full p-8 grid grid-rows-[var(--rail-size)_1fr]',
        topbar && 'grid-rows-1',
      )}
      data-testid='layoutPlugin.firstRunMessage'
    >
      <div
        role='toolbar'
        className={mx(soloInlinePadding, 'bs-[--rail-action] flex items-stretch', topbar && 'hidden')}
      >
        <ToggleSidebarButton />
        <span role='none' className='grow' />
      </div>
      <div role='none' className='grid place-items-center'>
        <Surface role='keyshortcuts' />
      </div>
    </div>
  );
};
