//
// Copyright 2023 DXOS.org
//
import React, { useEffect, useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { type Identity, useIdentity, useDevices, useHaloInvitations } from '@dxos/react-client/halo';
import { useInvitationStatus } from '@dxos/react-client/invitations';
import type { CancellableInvitationObservable } from '@dxos/react-client/invitations';
import { Avatar, DensityProvider, useId, useTranslation } from '@dxos/react-ui';
import { keyToFallback } from '@dxos/util';

import {
  type IdentityPanelHeadingProps,
  type IdentityPanelImplProps,
  type IdentityPanelProps,
} from './IdentityPanelProps';
import { useIdentityMachine } from './identityMachine';
import { AgentForm, DeviceManager, IdentityActionChooser, ProfileForm } from './steps';
import { useAgentHandlers } from './useAgentHandlers';
import { Viewport, Heading, CloseButton } from '../../components';
import { ConfirmReset, InvitationManager } from '../../steps';

const viewStyles = 'pbs-1 pbe-3 pli-3';

const IdentityHeading = ({ titleId, title, identity, onDone }: IdentityPanelHeadingProps) => {
  const fallbackValue = keyToFallback(identity.identityKey);
  return (
    <Heading titleId={titleId} title={title} corner={<CloseButton onDone={onDone} />}>
      <Avatar.Root size={12} variant='circle' status='active' hue={identity.profile?.data?.hue || fallbackValue.hue}>
        <Avatar.Frame classNames='block mbs-4 mbe-2 mli-auto chromatic-ignore'>
          <Avatar.Fallback text={identity.profile?.data?.emoji || fallbackValue.emoji} />
        </Avatar.Frame>
        <Avatar.Label classNames='block text-center font-light text-xl' data-testid='identityHeading.displayName'>
          {identity.profile?.displayName ?? generateName(identity.identityKey.toHex())}
        </Avatar.Label>
      </Avatar.Root>
    </Heading>
  );
};

export const IdentityPanelImpl = (props: IdentityPanelImplProps) => {
  const {
    identity,
    titleId,
    activeView,
    onUpdateProfile,
    onResetStorage,
    onJoinNewIdentity,
    IdentityActionChooser: IdentityActionChooserComponent = IdentityActionChooser,
    InvitationManager: InvitationManagerComponent = InvitationManager,
    onDone,
    ...rest
  } = props;
  const { t } = useTranslation('os');
  const title = useMemo(() => {
    switch (activeView) {
      case 'agent manager':
        return 'Manage Agent';
      case 'device invitation manager':
        return t('choose add device label');
      default:
        return t('identity heading');
    }
  }, [activeView, t]);

  const onCancelReset = () => rest.send?.('unchooseAction');

  return (
    <DensityProvider density='fine'>
      <IdentityHeading {...{ identity, titleId, title, onDone }} />
      <Viewport.Root activeView={activeView}>
        <Viewport.Views>
          <Viewport.View id='identity action chooser' classNames={viewStyles}>
            <IdentityActionChooserComponent active={activeView === 'identity action chooser'} {...rest} />
          </Viewport.View>
          <Viewport.View id='device invitation manager' classNames={viewStyles}>
            <InvitationManagerComponent
              active={activeView === 'device invitation manager'}
              {...rest}
              invitationUrl={rest.createInvitationUrl(rest.invitationCode!)}
            />
          </Viewport.View>
          <Viewport.View id='device manager' classNames={viewStyles}>
            <DeviceManager active={activeView === 'device manager'} {...rest} />
          </Viewport.View>
          <Viewport.View classNames={viewStyles} id='update profile form'>
            <ProfileForm
              send={rest.send}
              active={activeView === 'update profile form'}
              identity={identity}
              onUpdateProfile={onUpdateProfile}
            />
          </Viewport.View>
          <Viewport.View classNames={viewStyles} id='agent manager'>
            <AgentForm send={rest.send} active={activeView === 'agent manager'} {...rest} />
          </Viewport.View>
          <Viewport.View classNames={viewStyles} id='confirm join new identity'>
            <ConfirmReset
              active={activeView === 'confirm join new identity'}
              {...rest}
              mode='join new identity'
              onConfirm={onJoinNewIdentity}
              onCancel={onCancelReset}
            />
          </Viewport.View>
          <Viewport.View classNames={viewStyles} id='confirm reset storage'>
            <ConfirmReset
              active={activeView === 'confirm reset storage'}
              {...rest}
              mode='reset storage'
              onConfirm={onResetStorage}
              onCancel={onCancelReset}
            />
          </Viewport.View>
        </Viewport.Views>
      </Viewport.Root>
    </DensityProvider>
  );
};

const IdentityPanelWithInvitationImpl = ({
  invitation,
  ...props
}: IdentityPanelImplProps & { invitation: CancellableInvitationObservable }) => {
  const invitationStatus = useInvitationStatus(invitation);
  return <IdentityPanelImpl {...props} {...invitationStatus} />;
};

export const IdentityPanel = ({
  titleId: propsTitleId,
  createInvitationUrl = (code) => code,
  ...props
}: IdentityPanelProps) => {
  const titleId = useId('identityPanel__heading', propsTitleId);
  const client = useClient();
  const devices = useDevices();
  const identity = useIdentity();
  const invitations = useHaloInvitations();
  const agentProps = useAgentHandlers({ client, identity, invitations });
  if (!identity) {
    log.error('IdentityPanel rendered with no active identity.');
    return null;
  }
  const [identityState, identitySend, identityService] = useIdentityMachine(client);

  useEffect(() => {
    const subscription = identityService.subscribe((state) => {
      log('[state]', state);
    });

    return subscription.unsubscribe;
  }, [identityService]);

  const activeView = useMemo(() => {
    switch (true) {
      case identityState.matches('choosingAction'):
        return 'identity action chooser';
      case identityState.matches('managingDeviceInvitation'):
        return 'device invitation manager';
      case identityState.matches('managingDevices'):
        return 'device manager';
      case [{ managingProfile: 'idle' }, { managingProfile: 'pending' }].some(identityState.matches):
        return 'update profile form';
      case identityState.matches('confirmingResetStorage'):
        return 'confirm reset storage';
      case identityState.matches('confirmingJoinNewIdentity'):
        return 'confirm join new identity';
      case [{ managingAgent: 'idle' }, { managingAgent: 'pending' }].some(identityState.matches):
        return 'agent manager';
      default:
        return 'identity action chooser';
    }
  }, [identityState]);

  const onUpdateProfile = async (profile: NonNullable<Identity['profile']>) => {
    identitySend({ type: 'updateProfile' });
    await client.halo.updateProfile(profile);
  };

  const implProps = {
    ...props,
    identity,
    devices,
    activeView,
    send: identitySend,
    titleId,
    createInvitationUrl,
    onUpdateProfile,
    ...agentProps,
  } satisfies IdentityPanelImplProps;

  return identityState.context.invitation ? (
    <IdentityPanelWithInvitationImpl {...implProps} invitation={identityState.context.invitation} />
  ) : (
    <IdentityPanelImpl {...implProps} />
  );
};
