//
// Copyright 2023 DXOS.org
//

import { UserPlus, X } from 'phosphor-react';
import React, { cloneElement, useReducer } from 'react';

import { useClient, useDevices, useHaloInvitations, useIdentity } from '@dxos/react-client';
import { Button, DensityProvider, getSize, mx, Tooltip, useTranslation } from '@dxos/react-components';

import { DeviceList, InvitationList, PanelSeparator } from '../../components';
import { defaultSurface, subduedSurface } from '../../styles';

export type DevicesPanelProps = {
  titleId?: string;
  createInvitationUrl: (invitationCode: string) => string;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: () => void;
};

export type DevicesView = 'device list';

const DeviceListView = ({ createInvitationUrl, titleId, onDone, doneActionParent }: DevicesPanelProps) => {
  const { t } = useTranslation('os');
  const client = useClient();
  const identity = useIdentity();
  const devices = useDevices();
  const invitations = useHaloInvitations();
  const displayName = identity?.displayName;

  if (!identity) {
    return null;
  }

  const doneButton = (
    <Button variant='ghost' onClick={() => onDone?.()} data-testid='show-all-spaces'>
      <X className={getSize(4)} weight='bold' />
    </Button>
  );

  return (
    <div role='none' className='flex flex-col'>
      <div role='none' className={mx(subduedSurface, 'rounded-bs-md flex items-center p-2 gap-2')}>
        {/* TODO(wittjosiah): Label this as the identity panel. */}
        <h2 id={titleId} className={mx('grow font-system-medium', !displayName && 'font-mono')}>
          {displayName ?? identity.identityKey.truncate()}
        </h2>
        <Tooltip content={t('close label')} zIndex='z-50'>
          {doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}
        </Tooltip>
      </div>
      <div role='region' className={mx(defaultSurface, 'rounded-be-md p-2')}>
        <InvitationList
          invitations={invitations}
          onClickRemove={({ invitation }) => invitation && client.halo.removeInvitation(invitation.invitationId!)}
          createInvitationUrl={createInvitationUrl}
        />
        <Button
          className='is-full flex gap-2 mbs-2'
          onClick={() => client.halo.createInvitation()}
          data-testid='create-space-invitation'
        >
          <span>{t('create space invitation label')}</span>
          <UserPlus className={getSize(4)} weight='bold' />
        </Button>
        <PanelSeparator />
        <DeviceList devices={devices} />
      </div>
    </div>
  );
};

type DevicesPanelState = {
  activeView: DevicesView;
};

type DevicesPanelAction = {
  type: null;
};

// TODO(wittjosiah): Rename identity panel and include other views?
export const DevicesPanel = (props: DevicesPanelProps) => {
  const reducer = (state: DevicesPanelState, action: DevicesPanelAction) => {
    const nextState = { ...state };
    switch (action.type) {
      case null:
    }
    return nextState;
  };

  const [panelState] = useReducer(reducer, {
    activeView: 'device list'
  });

  // TODO(wittjosiah): Use ViewState or similar.
  return (
    <DensityProvider density='fine'>
      {panelState.activeView === 'device list' ? <DeviceListView {...props} /> : null}
    </DensityProvider>
  );
};
