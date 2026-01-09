//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Dialog } from './Dialog';
import { Main } from './Main';
import { PopoverContent, PopoverRoot } from './Popover';

// TODO(wittjosiah): Support toast.
export const SimpleLayout = () => {
  return (
    <PopoverRoot>
      <Main />
      <Dialog />
      <PopoverContent />
    </PopoverRoot>
  );
};
