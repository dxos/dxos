//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { type Event, type SingleOrArray } from 'xstate';

import { type Device } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';

import { Action, Actions, DeviceList } from '../../../components';
import type { IdentityPanelStepProps } from '../IdentityPanelProps';
import type { IdentityEvent } from '../identityMachine';

export interface DeviceManagerProps extends Omit<IdentityPanelStepProps, 'send'> {
  send?: (event: SingleOrArray<Event<IdentityEvent>>) => void;
  devices: Device[];
}

export const DeviceManager = ({ devices, active, send }: DeviceManagerProps) => {
  const { t } = useTranslation('os');
  const disabled = !active;

  return (
    <>
      <div role='none' className='grow'>
        <DeviceList devices={devices} />
      </div>
      <Actions>
        <Action
          variant='ghost'
          disabled={disabled}
          onClick={() => send?.({ type: 'unchooseAction' })}
          data-testid={'manage-devices-back'}
        >
          {t('back label')}
        </Action>
      </Actions>
    </>
  );
};
