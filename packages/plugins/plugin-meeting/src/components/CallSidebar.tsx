//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Call } from './Call';

export const CallSidebar = () => {
  return (
    <div className='flex flex-col h-full overflow-hidden'>
      <Call.Room />
      <Call.Toolbar />
    </div>
  );
};

export default CallSidebar;
