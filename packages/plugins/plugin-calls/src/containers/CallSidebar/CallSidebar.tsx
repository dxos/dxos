//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { log } from '@dxos/log';
import { Panel } from '@dxos/react-ui';
import { useSoundEffect } from '@dxos/react-ui-audio';

import { CallsCapabilities } from '#types';

import { Call } from '../../components/Call';

export const CallSidebar = () => {
  const call = useCapability(CallsCapabilities.Manager);
  const _roomId = useAtomValue(call.roomIdAtom);
  const leaveSound = useSoundEffect('LeaveCall');

  const handleLeave = useCallback(() => {
    leaveSound.play().catch((err) => log.catch(err));
    void call.turnAudioOff();
    void call.turnVideoOff();
    void call.turnScreenshareOff();
    void call.leave();
  }, [call, leaveSound]);

  return (
    <Call.Root>
      <Panel.Root>
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
