//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { SignalMessages } from './SignalMessages';
import { SignalStatusComp } from './SignalStatus';

export const SignalPanel = () => {
  return (
    <div className='flex flex-col flex-1 overflow-auto'>
      <div className='flex m-2'>
        <SignalStatusComp />
      </div>
      <div className='flex m-2'>
        <SignalMessages />
      </div>
    </div>
  );
};
