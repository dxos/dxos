//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Dialog } from '../Dialog';
import { PopoverContent, PopoverRoot } from '../Popover';

import { Main } from './Main';

export const SimpleLayout = () => {
  return (
    <PopoverRoot>
      <Main />
      <Dialog />
      <PopoverContent />
    </PopoverRoot>
  );
};
