//
// Copyright 2024 DXOS.org
//

import React, { useEffect, type FC } from 'react';

import { useCapability } from '@dxos/app-framework';
import { type Space } from '@dxos/react-client/echo';

import { Call } from './Call';
import { Lobby } from './Lobby';
import { MeetingCapabilities } from '../capabilities';

export type CallSidebarProps = {
  space: Space;
  roomId: string;
};

export const CallSidebar: FC<CallSidebarProps> = ({ space, roomId }) => {
  const call = useCapability(MeetingCapabilities.CallManager);

  useEffect(() => {
    call.setRoomId(roomId);
  }, [roomId, call.joined]);

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
