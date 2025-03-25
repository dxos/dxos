//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useCapability } from '@dxos/app-framework';

import { Call } from './Call';
import { Lobby } from './Lobby';
import { MeetingCapabilities } from '../capabilities';

export const CallSidebar = () => {
  const call = useCapability(MeetingCapabilities.CallManager);

  return (
    <div className='flex flex-col h-full overflow-hidden'>
      {call.joined ? (
        <>
          <Call.Room />
          <Call.Toolbar />
        </>
      ) : (
        <Lobby />
      )}
    </div>
  );
};

export default CallSidebar;
