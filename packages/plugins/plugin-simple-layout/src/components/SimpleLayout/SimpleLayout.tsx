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
import { MobileLayout } from './MobileLayout';

// TODO(burdon): Mobile/Desktop variance?
export const SimpleLayout = () => {
  const { state, updateState } = useSimpleLayoutState();

  // Sync all drawer state changes to state.
  const handleDrawerStateChange = useCallback(
    (nextState: DrawerState) => {
      updateState((state) => ({ ...state, drawerState: nextState }));
    },
    [updateState],
  );

  return (
    <Mosaic.Root classNames='contents'>
      <NaturalMain.Root drawerState={state.drawerState ?? 'closed'} onDrawerStateChange={handleDrawerStateChange}>
        <MobileLayout.Root>
          <PopoverRoot>
            <Main />
            <Drawer />
            <Dialog />
            <PopoverContent />
          </PopoverRoot>
        </MobileLayout.Root>
      </NaturalMain.Root>
    </Mosaic.Root>
  );
};
