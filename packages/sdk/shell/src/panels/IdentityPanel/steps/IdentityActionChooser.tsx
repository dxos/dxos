//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { DeviceType, useHaloInvitations } from '@dxos/react-client/halo';
import { type Invitation, Invitation_State, InvitationEncoder } from '@dxos/react-client/invitations';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Typography from '@dxos/react-ui/Typography';
import { getSize, mx } from '@dxos/ui-theme';

import {
  AgentConfig,
  type AgentFormProps,
  DeviceList,
  type DeviceListProps,
  toShellDevice,
} from '../../../components/index.ts';
import { translationKey } from '../../../translations.ts';
import { type IdentityPanelStepProps } from '../IdentityPanelProps.ts';

export type IdentityActionChooserProps = IdentityPanelStepProps;

export const IdentityActionChooser = (props: IdentityPanelStepProps) => {
  const { send } = props;
  const client = useClient();
  const invitations = useHaloInvitations();
  const createInvitation = () => {
    invitations.forEach((invitation) => invitation.cancel());
    // TODO(nf): allow user to make invitations non-persistent?
    const invitation = client.halo.share();
    if (client.config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'production') {
      const subscription = invitation.subscribe((invitation: Invitation) => {
        const invitationCode = InvitationEncoder.encode(invitation);
        if (invitation.state === Invitation_State.CONNECTING) {
          log.info(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
          subscription.unsubscribe();
        }
      });
    }
    send?.({ type: 'selectInvitation', invitation });
  };
  const isProduction = client.config.values.runtime?.app?.env?.DX_ENVIRONMENT === 'production';
  return (
    <IdentityActionChooserImpl
      {...props}
      onClickAdd={createInvitation}
      onClickJoinExisting={() => send?.({ type: 'chooseJoinNewIdentity' })}
      onClickRecover={isProduction ? undefined : () => send?.({ type: 'chooseRecoverIdentity' })}
      onClickReset={() => send?.({ type: 'chooseResetStorage' })}
    />
  );
};

export type IdentityActionChooserImplProps = IdentityActionChooserProps &
  Partial<AgentFormProps> &
  Pick<DeviceListProps, 'onClickJoinExisting' | 'onClickRecover' | 'onClickReset'> & {
    onClickAdd?: () => void;
  };

export const IdentityActionChooserImpl = ({
  devices,
  connectionState,
  heading,
  agentHostingEnabled,
  onClickAdd,
  onClickJoinExisting,
  onClickRecover,
  onClickReset,
  ...agentProps
}: IdentityActionChooserImplProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const shellDevices = useMemo(() => devices.map(toShellDevice), [devices]);
  const edgeDeviceAvailable = devices.find(
    (device) => device.profile?.type === DeviceType.AGENT_MANAGED && device.profile?.os?.toUpperCase() === 'EDGE',
  );
  return (
    <Dialog.Body gap='md'>
      {heading}
      <Typography.Text tone='muted'>{t('devices.heading')}</Typography.Text>
      {shellDevices.length > 0 && (
        <DeviceList
          devices={shellDevices}
          connectionState={connectionState}
          onClickJoinExisting={onClickJoinExisting}
          onClickRecover={agentProps.agentStatus === 'created' ? onClickRecover : undefined}
          onClickReset={onClickReset}
        />
      )}
      <Button.Root
        variant='ghost'
        classNames='justify-start gap-2 ps-0 pe-3 w-full'
        data-testid='devices-panel.create-invitation'
        onClick={onClickAdd}
      >
        <div role='img' className={mx(getSize(8), 'm-1 rounded-xs bg-input-surface grid place-items-center')}>
          <Icon.Icon icon='ph--plus--light' size='xl' />
        </div>
        <span className='grow font-medium text-start'>{t('choose-add-device.label')}</span>
        <Icon.Icon icon='ph--caret-right--bold' size='md' />
      </Button.Root>
      {!edgeDeviceAvailable && agentHostingEnabled && <AgentConfig {...(agentProps as AgentFormProps)} />}
    </Dialog.Body>
  );
};
