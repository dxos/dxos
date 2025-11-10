//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Surface, useCapability } from '@dxos/app-framework/react';

import { DeckCapabilities } from '../../capabilities';
import { useBreakpoints } from '../../hooks';
import { getMode } from '../../types';
import { layoutAppliesTopbar } from '../../util';
import { fixedSidebarToggleStyles } from '../fragments';
import { ToggleSidebarButton } from '../Sidebar';

export const ContentEmpty = () => {
  const breakpoint = useBreakpoints();
  const { deck } = useCapability(DeckCapabilities.MutableDeckState);
  const layoutMode = getMode(deck);
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  return (
    <div
      role='none'
      className='grid place-items-center p-8 relative bg-deckSurface'
      data-testid='layoutPlugin.firstRunMessage'
    >
      <Surface role='keyshortcuts' />
      {!topbar && <ToggleSidebarButton variant='default' classNames={fixedSidebarToggleStyles} />}
    </div>
  );
};
