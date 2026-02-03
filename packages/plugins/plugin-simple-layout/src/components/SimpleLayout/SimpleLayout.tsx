//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Main as NaturalMain } from '@dxos/react-ui';
import { Mosaic } from '@dxos/react-ui-mosaic';

import { Dialog } from '../Dialog';
import { PopoverContent, PopoverRoot } from '../Popover';

import { Drawer } from './Drawer';
import { Main } from './Main';

export const SimpleLayout = () => {
  return (
    <Mosaic.Root>
      <NaturalMain.Root>
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
