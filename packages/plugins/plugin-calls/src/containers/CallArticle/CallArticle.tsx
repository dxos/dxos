//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback } from 'react';

import { useCapabilities, useCapability } from '@dxos/app-framework/ui';
import { log } from '@dxos/log';
import { Panel, Toolbar } from '@dxos/react-ui';
import { useSoundEffect } from '@dxos/react-ui-audio';

import { CallsCapabilities } from '#types';

import { Call, Lobby } from '../../components';

export type CallArticleProps = {
  role?: string;
  /** Room to join — the call anchor's URI (e.g. the meeting's). */
  roomId: string;
  attendableId?: string;
};

/**
 * Video/participant grid for a call room. `roomId` selects the room; live peer/media state is owned
 * by `CallManager`. Joining/leaving goes through the registered `CallTransportProvider`. Shows the
 * live grid only when joined to *this* room; otherwise the lobby (join), even if another call is in
 * progress (joining leaves it first).
 */
export const CallArticle = ({ roomId }: CallArticleProps) => {
  const callManager = useCapability(CallsCapabilities.Manager);
  const provider = useCapabilities(CallsCapabilities.CallTransportProvider)[0];
  const joined = useAtomValue(callManager.joinedAtom);
  const currentRoomId = useAtomValue(callManager.roomIdAtom);
  const inThisRoom = joined && currentRoomId === roomId;
  const leaveSound = useSoundEffect('LeaveCall');

  const handleJoin = useCallback(() => {
    void provider?.join(roomId);
  }, [provider, roomId]);

  const handleLeave = useCallback(() => {
    leaveSound.play().catch((err) => log.catch(err));
    void callManager.turnAudioOff();
    void callManager.turnVideoOff();
    void callManager.turnScreenshareOff();
    void provider?.leave();
  }, [provider, callManager, leaveSound]);

  return (
    <Call.Root>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Call.Viewport>
            {inThisRoom ? (
              <>
                <Call.Grid />
                <Call.Toolbar onLeave={handleLeave} />
              </>
            ) : (
              <>
                <Lobby.Preview />
                <Lobby.Toolbar roomId={roomId} onJoin={handleJoin} />
              </>
            )}
          </Call.Viewport>
        </Panel.Content>
      </Panel.Root>
    </Call.Root>
  );
};
