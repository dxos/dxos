//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { log } from '@dxos/log';
import { Next } from '@dxos/react-ui';
import { useSoundEffect } from '@dxos/react-ui-audio';

import { CallsCapabilities } from '#types';

import { Call } from '../../components/Call/index.ts';

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
      <Next.Panel.Root>
        <Next.Panel.Body asChild>
          <Call.Viewport>
            <Call.Grid />
            <Call.Toolbar onLeave={handleLeave} />
          </Call.Viewport>
        </Next.Panel.Body>
      </Next.Panel.Root>
    </Call.Root>
  );
};

CallSidebar.displayName = 'CallSidebar';
