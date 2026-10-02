//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { log } from '@dxos/log';
import { useSoundEffect } from '@dxos/react-ui-audio';
import * as Panel from '@dxos/react-ui/Panel';

import { CallsCapabilities } from '#types';

import { Call } from '../../components/Call/index.ts';

export const CallSidebar = () => {
  const call = Hooks.useCapability(CallsCapabilities.Manager);
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
            <Call.Grid />
            <Call.Toolbar onLeave={handleLeave} />
          </Call.Viewport>
        </Panel.Content>
      </Panel.Root>
    </Call.Root>
  );
};

CallSidebar.displayName = 'CallSidebar';
