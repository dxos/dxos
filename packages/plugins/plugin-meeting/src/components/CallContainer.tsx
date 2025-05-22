//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, type FC } from 'react';

import { useAppGraph, useCapability } from '@dxos/app-framework';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { type Node, useConnections } from '@dxos/plugin-graph';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useSoundEffect } from '@dxos/react-ui-sfx';
import { StackItem } from '@dxos/react-ui-stack';

import { Call } from './Call';
import { Lobby } from './Lobby';
import { MeetingCapabilities } from '../capabilities';
import { type MeetingType, type MeetingCallProperties } from '../types';

export type CallContainerProps = {
  meeting?: MeetingType;
  roomId?: string;
  fullscreen?: boolean;
};

export const CallContainer: FC<CallContainerProps> = ({ meeting, roomId: _roomId, fullscreen }) => {
  const callManager = useCapability(MeetingCapabilities.CallManager);
  const roomId = meeting ? fullyQualifiedId(meeting) : _roomId;
  const { graph } = useAppGraph();
  const joinSound = useSoundEffect('JoinCall');
  const leaveSound = useSoundEffect('LeaveCall');

  useEffect(() => {
    if (!callManager.joined && roomId) {
      callManager.setRoomId(roomId);
    }
  }, [roomId, callManager.joined, callManager.roomId]);

  // TODO(thure): Should these be intents rather than callbacks?
  const companions = useConnections(graph, meeting && fullyQualifiedId(meeting)).filter(
    ({ type }) => type === PLANK_COMPANION_TYPE,
  ) as Node<any, MeetingCallProperties>[];
  useEffect(() => {
    const ctx = new Context();
    callManager.left.on(ctx, (roomId) => {
      companions.forEach((companion) => {
        void companion.properties.onLeave?.(roomId);
      });
    });

    callManager.callStateUpdated.on(ctx, (state) => {
      companions.forEach((companion) => {
        void companion.properties.onCallStateUpdated?.(state);
      });
    });

    callManager.mediaStateUpdated.on(ctx, (state) => {
      companions.forEach((companion) => {
        void companion.properties.onMediaStateUpdated?.(state);
      });
    });

    return () => {
      void ctx.dispose();
    };
  }, [callManager, companions]);

  // TODO(burdon): Try/catch.

  /**
   * Join the call.
   */
  const handleJoin = useCallback(async () => {
    if (!roomId) {
      return;
    }

    if (callManager.joined) {
      await callManager.leave();
    }

    try {
      void joinSound.play();
      callManager.setRoomId(roomId);
      await callManager.join();
      await Promise.all(companions.map((companion) => companion.properties.onJoin?.({ meeting, roomId })));
    } catch (err) {
      // TODO(burdon): Error sound.
      log.catch(err);
    }
  }, [companions, roomId]);

  /**
   * Leave the call.
   */
  const handleLeave = useCallback(async () => {
    try {
      void leaveSound.play();
      await Promise.all(companions.map((companion) => companion.properties.onLeave?.(roomId)));
    } catch (err) {
      // TODO(burdon): Error sound.
      log.catch(err);
    } finally {
      void callManager.turnAudioOff();
      void callManager.turnVideoOff();
      void callManager.turnScreenshareOff();
      void callManager.leave();
    }
  }, [companions, roomId]);

  if (!roomId) {
    return null;
  }

  return (
    // TODO(burdon): Modify StackItem to support top and bottom toolbars.
    <StackItem.Content classNames='h-full'>
      {callManager.joined && callManager.roomId === roomId ? (
        <Call.Root>
          <Call.Grid fullscreen={fullscreen} />
          <Call.Toolbar meeting={meeting} onLeave={handleLeave} />
        </Call.Root>
      ) : (
        <Lobby.Root>
          <Lobby.Preview />
          <Lobby.Toolbar roomId={roomId} onJoin={handleJoin} />
        </Lobby.Root>
      )}
    </StackItem.Content>
  );
};
