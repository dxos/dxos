//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, type FC } from 'react';

import { useCapability } from '@dxos/app-framework';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Call } from './Call';
import { Lobby } from './Lobby';
import { MeetingCapabilities } from '../capabilities';
import { useCompanions } from '../hooks';
import { type MeetingType } from '../types';

export type CallContainerProps = {
  meeting?: MeetingType;
  roomId?: string;
};

export const CallContainer: FC<CallContainerProps> = ({ meeting, roomId: _roomId }) => {
  const call = useCapability(MeetingCapabilities.CallManager);
  const roomId = meeting ? fullyQualifiedId(meeting) : _roomId;

  useEffect(() => {
    if (!call.joined && roomId) {
      call.setRoomId(roomId);
    }
  }, [roomId, call.joined, call.roomId]);

  const companions = useCompanions(meeting);
  const handleJoin = useCallback(() => {
    companions.forEach((companion) => {
      companion.properties.onJoin?.(roomId);
    });
  }, [companions, roomId]);

  if (!roomId) {
    return null;
  }

  return (
    <StackItem.Content toolbar={false}>
      {call.joined && call.roomId === roomId ? (
        <>
          <Call.Room />
          <Call.Toolbar meeting={meeting} />
        </>
      ) : (
        <Lobby roomId={roomId} onJoin={handleJoin} />
      )}
    </StackItem.Content>
  );
};
