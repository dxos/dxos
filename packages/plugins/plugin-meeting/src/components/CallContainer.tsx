//
// Copyright 2024 DXOS.org
//

import React, { useEffect, type FC } from 'react';

import { useCapability } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Call } from './Call';
import { Lobby } from './Lobby';
import { MeetingCapabilities } from '../capabilities';
import { type MeetingType } from '../types';

export type CallContainerProps = {
  meeting?: MeetingType;
  roomId?: string;
};

export const CallContainer: FC<CallContainerProps> = ({ meeting, roomId: _roomId }) => {
  const call = useCapability(MeetingCapabilities.CallManager);
  const roomId = meeting ? fullyQualifiedId(meeting) : _roomId;
  invariant(roomId);

  useEffect(() => {
    if (!call.joined) {
      call.setRoomId(roomId);
    }
  }, [roomId, call.joined, call.roomId]);

  return (
    <StackItem.Content toolbar={false}>
      {call.joined && call.roomId === roomId ? (
        <>
          <Call.Room />
          <Call.Toolbar meeting={meeting} />
        </>
      ) : (
        <Lobby roomId={roomId} />
      )}
    </StackItem.Content>
  );
};
