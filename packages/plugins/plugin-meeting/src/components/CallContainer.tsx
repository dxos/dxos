//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, type FC } from 'react';

import { useAppGraph, useCapability } from '@dxos/app-framework';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { useNode } from '@dxos/plugin-graph';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useSoundEffect } from '@dxos/react-ui-sfx';
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
  const { graph } = useAppGraph();
  const node = useNode(graph, meeting && fullyQualifiedId(meeting));
  const joinSound = useSoundEffect('JoinCall');
  const leaveSound = useSoundEffect('LeaveCall');

  useEffect(() => {
    if (!call.joined && roomId) {
      call.setRoomId(roomId);
    }
  }, [roomId, call.joined, call.roomId]);

  // TODO(thure): Should these be intents rather than callbacks?
  const companions = node ? graph.nodes(node, { type: PLANK_COMPANION_TYPE }) : [];
  useEffect(() => {
    const ctx = new Context();
    call.left.on(ctx, (roomId) => {
      companions.forEach((companion) => {
        companion.properties.onLeave?.(roomId);
      });
    });

    call.callStateUpdated.on(ctx, (state) => {
      companions.forEach((companion) => {
        companion.properties.onCallStateUpdated?.(state);
      });
    });

    call.mediaStateUpdated.on(ctx, (state) => {
      companions.forEach((companion) => {
        companion.properties.onMediaStateUpdated?.(state);
      });
    });

    return () => {
      void ctx.dispose();
    };
  }, [call, companions]);

  // TODO(burdon): Try/catch.

  /**
   * Join the call.
   */
  const handleJoin = useCallback(async () => {
    if (!roomId) {
      return;
    }

    if (call.joined) {
      await call.leave();
    }

    try {
      void joinSound.play();
      call.setRoomId(roomId);
      await call.join();

      companions.forEach((companion) => {
        companion.properties.onJoin?.(roomId);
      });
    } catch (err) {
      log.catch(err);
    }
  }, [companions, roomId]);

  /**
   * Leave the call.
   */
  const handleLeave = useCallback(async () => {
    try {
      companions.forEach((companion) => {
        companion.properties.onLeave?.(roomId);
      });
    } catch (err) {
      log.catch(err);
    } finally {
      void call.turnAudioOff();
      void call.turnVideoOff();
      void call.turnScreenshareOff();
      void call.leave();
      void leaveSound.play();
    }
  }, [companions, roomId]);

  if (!roomId) {
    return null;
  }

  return (
    // TODO(burdon): Modify StackItem to support top and bottom toolbars.
    <StackItem.Content classNames='h-full'>
      {call.joined && call.roomId === roomId ? (
        <Call.Root>
          <Call.Room />
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
