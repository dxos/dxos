//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type DrawerState, Input, Main as NaturalMain } from '@dxos/react-ui';
import { Mosaic } from '@dxos/react-ui-mosaic';

import { useSimpleLayoutState } from '../../hooks';
import { Dialog } from '../Dialog';
import { PopoverContent, PopoverRoot } from '../Popover';

import { Drawer } from './Drawer';
import { Main } from './Main';
import { MobileLayout } from './MobileLayout';

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
    <Mosaic.Root asChild>
      <MobileLayout.Root>
        <MobileLayout.Header>
          <div className='p-1 border'>HEADER</div>
        </MobileLayout.Header>
        <MobileLayout.Main>
          <div className='flex flex-col'>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className='p-1'>
                <Input.Root>
                  <Input.TextInput value={i} />
                </Input.Root>
              </div>
            ))}
          </div>
        </MobileLayout.Main>
        <MobileLayout.Footer>
          <div className='p-1 border'>FOOTER</div>
        </MobileLayout.Footer>
      </MobileLayout.Root>
    </Mosaic.Root>
  );

  return (
    <Mosaic.Root classNames='contents'>
      <MobileLayout.Root>
        <NaturalMain.Root drawerState={state.drawerState ?? 'closed'} onDrawerStateChange={handleDrawerStateChange}>
          <PopoverRoot>
            <Main />
            <Drawer />
            <Dialog />
            <PopoverContent />
          </PopoverRoot>
        </NaturalMain.Root>
      </MobileLayout.Root>
    </Mosaic.Root>
  );
};
