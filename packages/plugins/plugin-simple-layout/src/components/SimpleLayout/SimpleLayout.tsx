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
      updateState((s) => ({ ...s, drawerState: nextState }));
    },
    [updateState],
  );

  return (
    <Mosaic.Root>
      <NaturalMain.Root drawerState={state.drawerState ?? 'closed'} onDrawerStateChange={handleDrawerStateChange}>
        <PopoverRoot>
          <Main />
          <Drawer />
          <Dialog />
          <PopoverContent />
        </PopoverRoot>
      </NaturalMain.Root>
    </Mosaic.Root>
  );
};
