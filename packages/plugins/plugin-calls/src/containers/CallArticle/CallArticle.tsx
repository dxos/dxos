//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { log } from '@dxos/log';
import { useSoundEffect } from '@dxos/react-ui-audio';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Call, Lobby } from '#components';
import { CallsCapabilities } from '#types';

export type CallArticleProps = {
  role?: string;
  /** Room to join — the call anchor's URI (e.g. the meeting's). */
  roomId: string;
  attendableId?: string;
};

/**
 * Video/participant grid for a call room. Shows the live grid only when joined to *this* `roomId`;
 * otherwise the lobby (join), even while another call is in progress.
 */
export const CallArticle = ({ roomId }: CallArticleProps) => {
  const callManager = Hooks.useCapability(CallsCapabilities.Manager);
  const provider = Hooks.useCapabilities(CallsCapabilities.CallTransportProvider)[0];
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
                <Lobby.Toolbar roomId={roomId} onJoin={handleJoin} joinDisabled={!provider} />
              </>
            )}
          </Call.Viewport>
        </Panel.Content>
      </Panel.Root>
    </Call.Root>
  );
};

CallArticle.displayName = 'CallArticle';
