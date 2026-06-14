//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { log } from '@dxos/log';
import { Panel, Toolbar } from '@dxos/react-ui';
import { useSoundEffect } from '@dxos/react-ui-audio';

import { type Call as CallType, CallsCapabilities } from '#types';

import { Call } from '../../components';

export type CallArticleProps = AppSurface.ObjectArticleProps<CallType.Call>;

/**
 * Live video/participant grid for a `Call`. The persistent `Call` selects the
 * room; live peer/media state is owned by `CallManager`.
 */
export const CallArticle = (_props: CallArticleProps) => {
  const callManager = useCapability(CallsCapabilities.Manager);
  const _roomId = useAtomValue(callManager.roomIdAtom);
  const leaveSound = useSoundEffect('LeaveCall');

  const handleLeave = useCallback(() => {
    leaveSound.play().catch((err) => log.catch(err));
    void callManager.turnAudioOff();
    void callManager.turnVideoOff();
    void callManager.turnScreenshareOff();
    void callManager.leave();
  }, [callManager, leaveSound]);

  return (
    <Call.Root>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Call.Viewport>
            <Call.Audio />
            <Call.Grid />
            <Call.Toolbar onLeave={handleLeave} />
          </Call.Viewport>
        </Panel.Content>
      </Panel.Root>
    </Call.Root>
  );
};
