//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type Invitation } from '@dxos/halo';
import { useDevices, useInvitationFlow } from '@dxos/halo-react';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useNetworkStatus } from '@dxos/react-client/mesh';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as QrCode from '@dxos/react-ui/QrCode';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import { AuthCode, Centered, Emoji, Viewport } from '@dxos/shell/react';
import { osTranslations } from '@dxos/ui-theme';
import { hexToEmoji } from '@dxos/util';

import { DevicesForm } from '#components';
import { meta } from '#meta';
import { ClientOperation } from '#operations';
import { ClientCapabilities, ClientOptions } from '#types';

export type DevicesContainerProps = Pick<ClientOptions.ClientPluginOptions, 'identityTestActions'> & {
  createInvitationUrl?: (invitationCode: string) => string;
};

export const DevicesContainer = ({ createInvitationUrl, identityTestActions }: DevicesContainerProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const devices = useDevices();
  const { swarm: connectionState } = useNetworkStatus();

  const handleLogout = useCallback(() => invokePromise(ClientOperation.ResetStorage, {}), [invokePromise]);

  const handleRecover = useCallback(
    () => invokePromise(ClientOperation.ResetStorage, { mode: 'recover' }),
    [invokePromise],
  );

  const handleJoinNewIdentity = useCallback(
    () => invokePromise(ClientOperation.ResetStorage, { mode: 'join-new-identity' }),
    [invokePromise],
  );

  return (
    <DevicesForm
      devices={devices}
      connectionState={connectionState}
      invitation={createInvitationUrl && <DeviceInvitation createInvitationUrl={createInvitationUrl} />}
      onLogout={handleLogout}
      onRecover={identityTestActions ? handleRecover : undefined}
      onJoinNewIdentity={identityTestActions ? handleJoinNewIdentity : undefined}
    />
  );
};

type DeviceInvitationProps = {
  flow?: Invitation.Flow;
  createInvitationUrl: (invitationCode: string) => string;
  onInvitationDone: () => void;
  onInvitationCreate: () => void;
};

const DeviceInvitation = (props: Pick<DeviceInvitationProps, 'createInvitationUrl'>) => {
  // `client.config` only — the network status above keeps this container on the client regardless
  // (Missing API 9). The gate matters: an invitation code in a production console is a live secret.
  const client = useClient();
  const [identityService] = Hooks.useCapabilities(ClientCapabilities.IdentityService);
  const [flow, setFlow] = useState<Invitation.Flow>();
  // Latched before the share resolves, so a second click cannot open a second live invitation.
  const [pending, setPending] = useState(false);

  const onInvitationCreate = useCallback(() => {
    if (!identityService || pending || flow) {
      return;
    }
    setPending(true);
    // Requested explicitly because `share()` defaults to no authentication, which would leave the
    // invitation code as the only factor guarding an identity.
    void EffectEx.runPromise(identityService.share({ authMethod: 'shared-secret' }))
      .then(async (created) => {
        // Playwright reads this line off the console to drive the device-invitation flows.
        if (client.config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'production') {
          log.info(JSON.stringify({ invitationCode: await EffectEx.runPromise(created.code) }));
        }
        setFlow(created);
      })
      .catch((err) => log.catch(err))
      .finally(() => setPending(false));
  }, [client, identityService, pending, flow]);

  const onInvitationDone = useCallback(() => {
    // Cancel before dropping the handle: clearing local state alone leaves the host side listening.
    if (flow) {
      void EffectEx.runPromise(flow.cancel()).catch((err) => log.catch(err));
    }
    setFlow(undefined);
  }, [flow]);

  if (flow) {
    return <DeviceInvitationImpl {...props} {...{ flow, onInvitationCreate, onInvitationDone }} />;
  } else {
    return <InvitationSection {...props} {...{ onInvitationCreate, onInvitationDone }} />;
  }
};

const DeviceInvitationImpl = ({
  flow,
  createInvitationUrl,
  onInvitationDone,
  onInvitationCreate,
}: DeviceInvitationProps) => {
  const client = useClient();
  const { event, code } = useInvitationFlow(flow);
  const url = code && createInvitationUrl(code);

  // Logged separately from the invitation code Playwright reads on creation, because the host only
  // learns the auth code once a guest has connected.
  useEffect(() => {
    if (
      event?._tag === 'readyForAuthentication' &&
      client.config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'production'
    ) {
      log.info(JSON.stringify({ authCode: event.authCode }));
    }
  }, [event?._tag]);

  // Every terminal event returns to the creation view; parking on the completion icon would strand
  // a failed or cancelled invitation with no way to retry.
  useEffect(() => {
    if (event && (event._tag === 'success' || event._tag === 'cancelled' || event._tag === 'error')) {
      onInvitationDone();
    }
  }, [event?._tag]);

  return <InvitationSection {...{ event, invitationId: flow?.id, url, onInvitationDone, onInvitationCreate }} />;
};

type InvitationComponentProps = Partial<
  Pick<DeviceInvitationProps, 'onInvitationDone' | 'onInvitationCreate'> & {
    event: Invitation.Event;
    invitationId: string;
    url: string;
  }
>;

const InvitationSection = ({
  event,
  invitationId = 'never',
  url = 'never',
  onInvitationDone = () => {},
  onInvitationCreate = () => {},
}: InvitationComponentProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const authCode = event?._tag === 'readyForAuthentication' ? event.authCode : undefined;
  const activeView = !event
    ? 'init'
    : event._tag === 'cancelled' || event._tag === 'error' || event._tag === 'success'
      ? 'complete'
      : authCode
        ? 'auth-code'
        : 'qr-code';

  return activeView === 'init' ? (
    <>
      <p className='text-fg-muted mb-2'>{t('add-device.description')}</p>
      <Button.Root
        icon='ph--plus--regular'
        label={t('create-device-invitation.label')}
        disabled={!!event}
        classNames='w-full'
        data-testid='devicesContainer.createInvitation'
        onClick={onInvitationCreate}
      />
    </>
  ) : (
    <Viewport.Root activeView={activeView}>
      <Viewport.Views>
        <Viewport.View id='init'>
          {/* This view intentionally left blank while conditionally rendering the viewport. */}
        </Viewport.View>
        <Viewport.View id='complete'>
          <InvitationComplete succeeded={event?._tag === 'success'} />
        </Viewport.View>
        <Viewport.View id='auth-code'>
          <InvitationAuthCode id={invitationId} code={authCode ?? 'never'} onCancel={onInvitationDone} />
        </Viewport.View>
        <Viewport.View id='qr-code'>
          <InvitationQR id={invitationId} url={url} onCancel={onInvitationDone} />
        </Viewport.View>
      </Viewport.Views>
    </Viewport.Root>
  );
};

const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCancel: () => void }) => {
  const { t } = UiHooks.useTranslation(osTranslations);
  const qrLabel = UiHooks.useId('devices-container__qr-code');
  const emoji = hexToEmoji(id);
  return (
    <>
      <p className='text-fg-muted'>{t('qr-code.description', { ns: meta.profile.key })}</p>
      <Layout.Grid role='group' cols={['fill', 'min']}>
        <Layout.Flex justify='center' classNames='py-4'>
          <div className='w-full md:max-w-80 aspect-square relative text-fg-muted'>
            <QrCode.QrCode aria-labelledby={qrLabel} errorCorrection='Q' value={url ?? 'never'} />
            <Centered>
              <Emoji text={emoji} />
            </Centered>
          </div>
        </Layout.Flex>
        <span id={qrLabel} className='sr-only'>
          {t('qr.label')}
        </span>
      </Layout.Grid>
      {/* TODO(burdon): Factor out button bar */}
      <Layout.Flex justify='center'>
        <Layout.Flex gap='sm'>
          <SystemButton.Clipboard value={url ?? 'never'} />
          <Button.Root variant='ghost' onClick={onCancel}>
            {t('cancel.label')}
          </Button.Root>
        </Layout.Flex>
      </Layout.Flex>
    </>
  );
};

const InvitationAuthCode = ({ id, code, onCancel }: { id: string; code: string; onCancel: () => void }) => {
  const { t } = UiHooks.useTranslation(osTranslations);
  const emoji = hexToEmoji(id);

  return (
    <>
      <p className='text-fg-muted'>{t('auth-other-device-emoji.message')}</p>
      {emoji && <Emoji text={emoji} className='mx-auto my-2 text-center' />}
      <p className='text-fg-muted'>{t('auth-code.message')}</p>
      <AuthCode code={code} large classNames='mx-auto my-2 text-center grow' />
      <Button.Root variant='ghost' onClick={onCancel}>
        {t('cancel.label')}
      </Button.Root>
    </>
  );
};

const InvitationComplete = ({ succeeded }: { succeeded: boolean }) => {
  return succeeded ? (
    <Icon.Icon icon='ph--check--regular' size='xl' classNames='m-trim-xs' />
  ) : (
    <Icon.Icon icon='ph--x--regular' size='xl' classNames='m-trim-xs' />
  );
};

DevicesContainer.displayName = 'DevicesContainer';
