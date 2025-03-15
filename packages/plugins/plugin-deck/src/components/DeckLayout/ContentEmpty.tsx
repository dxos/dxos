//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';

import { ToggleSidebarButton } from './SidebarButton';
import { layoutAppliesTopbar, useBreakpoints } from '../../util';
import { fixedSidebarToggleStyles } from '../fragments';

export const ContentEmpty = () => {
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint);
  return (
    <div
      role='none'
      className='grid place-items-center p-8 relative bg-deck'
      data-testid='layoutPlugin.firstRunMessage'
    >
      <Surface role='keyshortcuts' />
      {!topbar && <ToggleSidebarButton variant='default' classNames={fixedSidebarToggleStyles} />}
    </div>
  );
};
