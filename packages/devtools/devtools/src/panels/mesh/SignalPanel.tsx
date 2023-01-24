//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { SignalMessages } from './SignalMessages';
import { SignalStatusComp as SignalStatus } from './SignalStatus';

export const SignalPanel = () => {
  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='flex flex-shrink-0 overflow-hidden'>
        <SignalStatus />
      </div>
      <div className='flex flex-1 overflow-hidden'>
        <SignalMessages />
      </div>
    </div>
  );
};
