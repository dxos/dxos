//
// Copyright 2023 DXOS.org
//
import { CopySimple, Plugs, PlugsConnected } from '@phosphor-icons/react';
import React, { useEffect, useMemo, useState } from 'react';

import { generateName } from '@dxos/display-name';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { type Identity, useIdentity, useDevices, useHaloInvitations } from '@dxos/react-client/halo';
import { useInvitationStatus } from '@dxos/react-client/invitations';
import type { CancellableInvitationObservable } from '@dxos/react-client/invitations';
import { useNetworkStatus, ConnectionState } from '@dxos/react-client/mesh';
import { Avatar, DensityProvider, Input, Toolbar, useId, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';
import { hexToEmoji, hexToHue, keyToFallback } from '@dxos/util';

import {
  type IdentityPanelHeadingProps,
  type IdentityPanelImplProps,
  type IdentityPanelProps,
} from './IdentityPanelProps';
import { useIdentityMachine } from './identityMachine';
import { AgentForm, DeviceManager, IdentityActionChooser, ProfileForm } from './steps';
import { useAgentHandlers } from './useAgentHandlers';
import {
  Viewport,
  Heading,
  CloseButton,
  EmojiPickerToolbarButton,
  useClipboardContext,
  HuePickerToolbarButton,
} from '../../components';
import { ConfirmReset, InvitationManager } from '../../steps';

const viewStyles = 'pbs-1 pbe-3 pli-3';

// TODO(thure): Factor out?
const getHueValue = (identity?: Identity) =>
  identity?.profile?.data?.hue || hexToHue(identity?.identityKey.toHex() ?? '0');
const getEmojiValue = (identity?: Identity) =>
  identity?.profile?.data?.emoji || hexToEmoji(identity?.identityKey.toHex() ?? '0');

const IdentityHeading = ({
  titleId,
  title,
  identity,
  onDone,
  onUpdateProfile,
  connectionState,
  onChangeConnectionState,
}: IdentityPanelHeadingProps) => {
  const fallbackValue = keyToFallback(identity.identityKey);
  const { t } = useTranslation('os');
  const [displayName, setDisplayName] = useState(identity.profile?.displayName ?? '');
  const [emoji, setEmoji] = useState<string>(getEmojiValue(identity));
  const [hue, setHue] = useState<string>(getHueValue(identity));
  const { textValue, setTextValue } = useClipboardContext();
  const identityHex = identity?.identityKey.toHex();
  const copied = textValue === identityHex;

  const handleUpdateProfile = async () => {
    const nextProfile = {
      ...(displayName && { displayName }),
      ...((emoji || hue) && { data: { ...(emoji && { emoji }), ...(hue && { hue }) } }),
    };
    return onUpdateProfile?.(nextProfile);
  };

  useEffect(() => {
    void handleUpdateProfile();
  }, [emoji, hue]);

  const isConnected = connectionState === ConnectionState.ONLINE;

  return (
    <Heading titleId={titleId} title={title} corner={<CloseButton onDone={onDone} />}>
      <Avatar.Root size={16} variant='circle' status={isConnected ? 'active' : 'error'} hue={hue || fallbackValue.hue}>
        <Toolbar.Root classNames='grid grid-cols-[1fr_var(--rail-action)_min-content_var(--rail-action)_1fr] items-center gap-2'>
          <Toolbar.Button
            classNames='bs-[--rail-action] is-[--rail-action] justify-self-end'
            data-testid='update-profile-form-copy-key'
            onClick={() => {
              if (identityHex) {
                void setTextValue(identityHex);
              }
            }}
          >
            <span className='sr-only'>{t(copied ? 'copy success label' : 'copy self public key label')}</span>
            <CopySimple className={getSize(5)} />
          </Toolbar.Button>
          <EmojiPickerToolbarButton
            emoji={emoji}
            onChangeEmoji={setEmoji}
            classNames='bs-[--rail-action] is-[--rail-action]'
          />
          <Avatar.Frame classNames='relative z-[2] -mli-4 chromatic-ignore'>
            <Avatar.Fallback text={emoji || fallbackValue.emoji} />
          </Avatar.Frame>
          <HuePickerToolbarButton hue={hue} onChangeHue={setHue} classNames='bs-[--rail-action] is-[--rail-action]' />
          <Toolbar.Button
            classNames='bs-[--rail-action] is-[--rail-action] justify-self-start'
            onClick={() => onChangeConnectionState?.(isConnected ? ConnectionState.OFFLINE : ConnectionState.ONLINE)}
          >
            <span className='sr-only'>{t(isConnected ? 'disconnect label' : 'connect label')}</span>
            {isConnected ? <PlugsConnected className={getSize(5)} /> : <Plugs className={getSize(5)} />}
          </Toolbar.Button>
        </Toolbar.Root>
        <Avatar.Label classNames='sr-only' data-testid='identityHeading.displayName'>
          {identity.profile?.displayName ?? generateName(identity.identityKey.toHex())}
        </Avatar.Label>
        <Input.Root>
          <Input.Label srOnly>{t('display name input label')}</Input.Label>
          <Input.TextInput
            variant='subdued'
            data-testid='display-name-input'
            placeholder={t('display name input placeholder')}
            classNames='text-center font-light text-xl'
            value={displayName}
            onChange={({ target: { value } }) => {
              setDisplayName(value);
            }}
            onBlur={handleUpdateProfile}
          />
        </Input.Root>
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
    connectionState,
    onChangeConnectionState,
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
      <IdentityHeading
        {...{ identity, titleId, title, onDone, onUpdateProfile, connectionState, onChangeConnectionState }}
      />
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
  initialDisposition = 'default',
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
  const [identityState, identitySend, identityService] = useIdentityMachine(client, {
    context: { initialDisposition },
  });

  const { swarm: connectionState } = useNetworkStatus();

  const handleChangeConnectionState = async (nextState: ConnectionState) => client?.mesh.updateConfig(nextState);

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
    connectionState,
    onChangeConnectionState: handleChangeConnectionState,
    ...agentProps,
  } satisfies IdentityPanelImplProps;

  return identityState.context.invitation ? (
    <IdentityPanelWithInvitationImpl {...implProps} invitation={identityState.context.invitation} />
  ) : (
    <IdentityPanelImpl {...implProps} />
  );
};
