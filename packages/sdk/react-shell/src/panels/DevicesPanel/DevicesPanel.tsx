//
// Copyright 2023 DXOS.org
//

import { UserPlus, X } from '@phosphor-icons/react';
import React, { cloneElement, useCallback } from 'react';

import { Button, Separator, DensityProvider, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { TooltipContent, TooltipRoot, TooltipTrigger } from '@dxos/react-appkit';
import { useClient } from '@dxos/react-client';
import { useDevices, useHaloInvitations, useIdentity } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { DeviceList, InvitationList } from '../../components';
import { defaultSurface, subduedSurface } from '../../styles';

export type DevicesPanelProps = {
  titleId?: string;
  createInvitationUrl: (invitationCode: string) => string;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: () => void;
};

export type DevicesView = 'device list';

export const DevicesPanel = ({ titleId, doneActionParent, onDone, createInvitationUrl }: DevicesPanelProps) => {
  const { t } = useTranslation('os');
  const client = useClient();
  const identity = useIdentity();
  const devices = useDevices();
  const invitations = useHaloInvitations();
  const displayName = identity?.profile?.displayName;

  if (!identity) {
    return null;
  }

  const onInvitationEvent = useCallback((invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    if (invitation.state === Invitation.State.CONNECTING) {
      console.log(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
    }
  }, []);

  const doneButton = (
    <Button variant='ghost' onClick={() => onDone?.()} data-testid='show-all-spaces'>
      <X className={getSize(4)} weight='bold' />
    </Button>
  );

  return (
    <DensityProvider density='fine'>
      <div role='none' className='flex flex-col'>
        <div role='none' className={mx(subduedSurface, 'rounded-bs-md flex items-center p-2 gap-2')}>
          {/* TODO(wittjosiah): Label this as the identity panel. */}
          <h2 id={titleId} className={mx('grow font-system-medium', !displayName && 'font-mono')}>
            {t('devices heading')}
          </h2>
          <TooltipRoot>
            <TooltipContent classNames='z-50'>{t('close label')}</TooltipContent>
            <TooltipTrigger asChild>
              {doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}
            </TooltipTrigger>
          </TooltipRoot>
        </div>
        <div role='region' className={mx(defaultSurface, 'rounded-be-md p-2')}>
          <InvitationList
            invitations={invitations}
            onClickRemove={(invitation) => invitation.cancel()}
            createInvitationUrl={createInvitationUrl}
          />
          <Button
            classNames='is-full flex gap-2 mbs-2'
            onClick={() => {
              const invitation = client.halo.createInvitation();
              // TODO(wittjosiah): Don't depend on NODE_ENV.
              if (process.env.NODE_ENV !== 'production') {
                invitation.subscribe(onInvitationEvent);
              }
            }}
            data-testid='devices-panel.create-invitation'
          >
            <span>{t('create device invitation label')}</span>
            <UserPlus className={getSize(4)} weight='bold' />
          </Button>
          <Separator />
          <DeviceList devices={devices} />
        </div>
      </div>
    </DensityProvider>
  );
};
