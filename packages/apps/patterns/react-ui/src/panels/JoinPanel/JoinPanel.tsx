//
// Copyright 2023 DXOS.org
//
import React, { useEffect } from 'react';

import { log } from '@dxos/log';
import { useClient, useIdentity } from '@dxos/react-client';
import { useId, useThemeContext, useTranslation } from '@dxos/react-components';

import { JoinPanelComponent } from './JoinPanelComponent';
import { JoinPanelProps } from './JoinPanelProps';
import { useJoinMachine } from './joinMachine';

export const JoinPanel = ({
  mode = 'default',
  initialInvitationCode,
  exitActionParent,
  onExit,
  doneActionParent,
  onDone,
  preventExit = false
}: JoinPanelProps) => {
  const client = useClient();
  const identity = useIdentity();
  const titleId = useId('joinPanel__title');
  const { hasIosKeyboard } = useThemeContext();
  const { t } = useTranslation('os');
  const [joinState, joinSend, joinService] = useJoinMachine(client, {
    context: {
      mode,
      identity,
      ...(initialInvitationCode && {
        [mode === 'halo-only' ? 'halo' : 'space']: { unredeemedCode: initialInvitationCode }
      })
    }
  });

  useEffect(() => {
    const subscription = joinService.subscribe((state) => {
      log('[state]', state);
    });

    return subscription.unsubscribe;
  }, [joinService]);

  return (
    <JoinPanelComponent
      {...{
        mode,
        state: joinState,
        send: joinSend,
        identity,
        hasIosKeyboard,
        initialInvitationCode,
        preventExit,
        onExit,
        onDone
      }}
    />
  );
};
