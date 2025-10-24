//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { debounce } from '@dxos/async';
import { generateName } from '@dxos/display-name';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { type Identity, useDevices, useHaloInvitations, useIdentity } from '@dxos/react-client/halo';
import { useInvitationStatus } from '@dxos/react-client/invitations';
import { type CancellableInvitationObservable } from '@dxos/react-client/invitations';
import { ConnectionState, useNetworkStatus } from '@dxos/react-client/mesh';
import { Avatar, Clipboard, Icon, Input, Toolbar, Tooltip, useId, useTranslation } from '@dxos/react-ui';
import { EmojiPickerToolbarButton, HuePicker } from '@dxos/react-ui-pickers';
import { errorText } from '@dxos/react-ui-theme';
import { hexToEmoji, hexToHue, keyToFallback } from '@dxos/util';

import { CloseButton, Heading, Viewport } from '../../components';
import { ConfirmReset, InvitationManager } from '../../steps';

import { useIdentityMachine } from './identityMachine';
import {
  type IdentityPanelHeadingProps,
  type IdentityPanelImplProps,
  type IdentityPanelProps,
} from './IdentityPanelProps';
import { IdentityActionChooser } from './steps';
import { useAgentHandlers } from './useAgentHandlers';

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
  onManageCredentials,
}: IdentityPanelHeadingProps) => {
  const fallbackValue = keyToFallback(identity.identityKey);
  const { t } = useTranslation('os');
  const [displayName, setDisplayNameDirectly] = useState(identity.profile?.displayName ?? '');
  const [emoji, setEmojiDirectly] = useState<string>(getEmojiValue(identity));
  const [hue, setHueDirectly] = useState<string | undefined>(getHueValue(identity));

  const updateDisplayName = useMemo(
    () =>
      debounce(
        (nextDisplayName: string) => onUpdateProfile?.({ ...identity.profile, displayName: nextDisplayName }),
        3_000,
      ),
    [onUpdateProfile, identity.profile],
  );

  const setDisplayName = (nextDisplayName: string) => {
    setDisplayNameDirectly(nextDisplayName);
    void updateDisplayName(nextDisplayName);
  };

  const setEmoji = (nextEmoji: string) => {
    setEmojiDirectly(nextEmoji);
    void onUpdateProfile?.({ ...identity.profile, data: { ...identity.profile?.data, emoji: nextEmoji } });
  };

  const setHue = (nextHue: string | undefined) => {
    setHueDirectly(nextHue);
    void onUpdateProfile?.({ ...identity.profile, data: { ...identity.profile?.data, hue: nextHue } });
  };

  const isConnected = connectionState === ConnectionState.ONLINE;

  return (
    <Heading titleId={titleId} title={title} corner={<CloseButton onDone={onDone} />}>
      <Avatar.Root>
        <Toolbar.Root classNames='justify-center'>
          <Avatar.Content
            size={16}
            variant='circle'
            status={isConnected ? 'active' : 'error'}
            hue={hue || fallbackValue.hue}
            fallback={emoji || fallbackValue.emoji}
            classNames='relative z-[2] -mli-4 chromatic-ignore'
          />
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
            classNames='mbs-2 text-center font-light text-xl'
            value={displayName}
            onChange={({ target: { value } }) => setDisplayName(value)}
          />
        </Input.Root>

        <Toolbar.Root classNames='justify-center pt-3'>
          <EmojiPickerToolbarButton emoji={emoji} onChangeEmoji={setEmoji} classNames='bs-[--rail-action]' />
          <HuePicker
            value={hue}
            onChange={setHue}
            onReset={() => setHue(undefined)}
            classNames='bs-[--rail-action]'
            rootVariant='toolbar-button'
          />
          <Clipboard.IconButton
            classNames='bs-[--rail-action]'
            data-testid='update-profile-form-copy-key'
            label={t('copy self did label')}
            value={identity.did}
          />
          {onManageCredentials && (
            <Tooltip.Trigger asChild content={t('manage credentials label')} side='bottom'>
              <Toolbar.Button classNames='bs-[--rail-action]' onClick={onManageCredentials}>
                <span className='sr-only'>{t('manage credentials label')}</span>
                <Icon icon='ph--identification-card--regular' size={5} />
              </Toolbar.Button>
            </Tooltip.Trigger>
          )}
          <Tooltip.Trigger asChild content={t(isConnected ? 'disconnect label' : 'connect label')} side='bottom'>
            <Toolbar.Button
              classNames={['bs-[--rail-action]', !isConnected && errorText]}
              onClick={() => onChangeConnectionState?.(isConnected ? ConnectionState.OFFLINE : ConnectionState.ONLINE)}
            >
              <span className='sr-only'>{t(isConnected ? 'disconnect label' : 'connect label')}</span>
              <Icon icon={isConnected ? 'ph--plugs-connected--regular' : 'ph--plugs--regular'} size={5} />
            </Toolbar.Button>
          </Tooltip.Trigger>
        </Toolbar.Root>
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
    onRecover,
    onJoinNewIdentity,
    IdentityActionChooser: IdentityActionChooserComponent = IdentityActionChooser,
    InvitationManager: InvitationManagerComponent = InvitationManager,
    connectionState,
    onChangeConnectionState,
    onDone,
    onManageCredentials,
    ...rest
  } = props;
  const { t } = useTranslation('os');
  const title = useMemo(() => {
    switch (activeView) {
      case 'device invitation manager':
        return t('choose add device label');
      default:
        return t('identity heading');
    }
  }, [activeView, t]);

  const onCancelReset = () => rest.send?.('unchooseAction');
  const hideRecover = rest.agentStatus !== 'created';

  return (
    <>
      <IdentityHeading
        {...{
          identity,
          titleId,
          title,
          hideRecover,
          onDone,
          onUpdateProfile,
          connectionState,
          onChangeConnectionState,
          onManageCredentials,
        }}
      />
      <Viewport.Root activeView={activeView}>
        <Viewport.Views>
          <Viewport.View id='identity action chooser' classNames={viewStyles}>
            <IdentityActionChooserComponent
              active={activeView === 'identity action chooser'}
              {...rest}
              connectionState={connectionState}
            />
          </Viewport.View>
          <Viewport.View id='device invitation manager' classNames={viewStyles}>
            <InvitationManagerComponent
              active={activeView === 'device invitation manager'}
              {...rest}
              invitationUrl={rest.createInvitationUrl(rest.invitationCode!)}
            />
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
          <Viewport.View classNames={viewStyles} id='confirm recover'>
            <ConfirmReset
              active={activeView === 'confirm recover'}
              {...rest}
              mode='recover'
              onConfirm={onRecover}
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
    </>
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
  const agentProps = useAgentHandlers({ identity, invitations });
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
      case identityState.matches('confirmingResetStorage'):
        return 'confirm reset storage';
      case identityState.matches('confirmingRecover'):
        return 'confirm recover';
      case identityState.matches('confirmingJoinNewIdentity'):
        return 'confirm join new identity';
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
