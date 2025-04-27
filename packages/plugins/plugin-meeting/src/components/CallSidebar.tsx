//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Call } from './Call';

export const CallSidebar = () => {
  return (
    <Call.Root>
      <Call.Room />
      <Call.Toolbar />
    </Call.Root>
  );
};

export default CallSidebar;
