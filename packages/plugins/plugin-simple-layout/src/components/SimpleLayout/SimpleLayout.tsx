//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type DrawerState, Main as NaturalMain } from '@dxos/react-ui';
import { Mosaic } from '@dxos/react-ui-mosaic';

import { useSimpleLayoutState } from '../../hooks';
import { Dialog } from '../Dialog';
import { PopoverContent, PopoverRoot } from '../Popover';

import { Drawer } from './Drawer';
import { Main } from './Main';

export const SimpleLayout = () => {
  const { state, updateState } = useSimpleLayoutState();

  const handleDrawerStateChange = useCallback(
    (nextState: DrawerState) => {
      // Sync all drawer state changes to state.
      updateState((state) => ({ ...state, drawerState: nextState }));
    },
    [updateState],
  );

  return (
    <Mosaic.Root classNames='dx-main-mobile-layout border-[8px] border-red-500'>
      <PopoverRoot>
        <NaturalMain.Root drawerState={state.drawerState ?? 'closed'} onDrawerStateChange={handleDrawerStateChange}>
          <Main />
          <Drawer />
          <Dialog />
          <PopoverContent />
        </NaturalMain.Root>
      </PopoverRoot>
    </Mosaic.Root>
  );
};
