//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { QR } from 'react-qr-rounded';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { EffectEx } from '@dxos/effect';
import { type Identity, type Invitation } from '@dxos/halo';
import { useDevices, useInvitationFlow } from '@dxos/halo-react';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useNetworkStatus } from '@dxos/react-client/mesh';
import { Button, Clipboard, Flex, Icon, IconButton, useId, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';
import { AuthCode, Centered, DeviceListItem, Emoji, Viewport } from '@dxos/shell/react';
import { osTranslations } from '@dxos/ui-theme';
import { hexToEmoji } from '@dxos/util';

import { meta } from '#meta';
import { ClientOperation } from '#operations';
import { ClientCapabilities, ClientOptions } from '#types';

export type DevicesContainerProps = Pick<ClientOptions.ClientPluginOptions, 'identityTestActions'> & {
  createInvitationUrl?: (invitationCode: string) => string;
};

export const DevicesContainer = ({ createInvitationUrl, identityTestActions }: DevicesContainerProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
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
    <Clipboard.Provider>
      <Form.Root variant='settings'>
        <Form.Viewport scroll>
          <Form.Content>
            <Form.Section
              title={t('devices-verbose.label', { ns: meta.profile.key })}
              description={t('devices.description', { ns: meta.profile.key })}
            >
              <Form.Group>
                <div role='group' className='min-w-0'>
                  <h3 className='text-lg mb-2'>{t('devices.label', { ns: meta.profile.key })}</h3>
                  <Listbox.Root>
                    <Listbox.Content aria-label={t('devices.label', { ns: meta.profile.key })}>
                      {devices.map((device: Identity.DeviceInfo) => (
                        <DeviceListItem key={device.key} device={device} connectionState={connectionState} />
                      ))}
                    </Listbox.Content>
                  </Listbox.Root>
                </div>
                {createInvitationUrl && (
                  <div role='group' className='min-w-0'>
                    <h3 className='text-lg mb-2'>{t('add-device.label')}</h3>
                    <DeviceInvitation createInvitationUrl={createInvitationUrl} />
                  </div>
                )}
              </Form.Group>
            </Form.Section>
            <Form.Section title={t('logout-section.title')} description={t('logout-section.description')}>
              <Form.Row label={t('logout.label')} description={t('logout.description')}>
                <Button variant='destructive' onClick={handleLogout} data-testid='devicesContainer.logout'>
                  {t('logout.label')}
                </Button>
              </Form.Row>
            </Form.Section>
            {identityTestActions && (
              <Form.Section
                title={t('identity-test-section.title')}
                description={t('identity-test-section.description')}
              >
                <Form.Row label={t('recover-identity.label')} description={t('recover-identity.description')}>
                  <Button variant='destructive' onClick={handleRecover} data-testid='devicesContainer.recover'>
                    {t('recover-identity.label')}
                  </Button>
                </Form.Row>
                <Form.Row label={t('join-new-identity.label')} description={t('join-new-identity.description')}>
                  <Button
                    variant='destructive'
                    onClick={handleJoinNewIdentity}
                    data-testid='devicesContainer.joinExisting'
                  >
                    {t('join-new-identity.label')}
                  </Button>
                </Form.Row>
              </Form.Section>
            )}
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Clipboard.Provider>
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
  const [identityService] = useCapabilities(ClientCapabilities.IdentityService);
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
  const { t } = useTranslation(meta.profile.key);
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
      <p className='text-description mb-2'>{t('add-device.description')}</p>
      <IconButton
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
  const { t } = useTranslation(osTranslations);
  const qrLabel = useId('devices-container__qr-code');
  const emoji = hexToEmoji(id);
  return (
    <>
      <p className='text-description'>{t('qr-code.description', { ns: meta.profile.key })}</p>
      <div role='group' className='grid grid-cols-[1fr_min-content]'>
        <Flex justify='center' classNames='py-4'>
          <div className='w-full md:max-w-80 aspect-square relative text-description'>
            <QR
              rounding={100}
              backgroundColor='transparent'
              color='currentColor'
              aria-labelledby={qrLabel}
              errorCorrectionLevel='Q'
              cutout={true}
            >
              {url ?? 'never'}
            </QR>
            <Centered>
              <Emoji text={emoji} />
            </Centered>
          </div>
        </Flex>
        <span id={qrLabel} className='sr-only'>
          {t('qr.label')}
        </span>
      </div>
      {/* TODO(burdon): Factor out button bar */}
      <Flex justify='center'>
        <Flex gap='sm'>
          <Clipboard.Button value={url ?? 'never'} />
          <Button variant='ghost' onClick={onCancel}>
            {t('cancel.label')}
          </Button>
        </Flex>
      </Flex>
    </>
  );
};

const InvitationAuthCode = ({ id, code, onCancel }: { id: string; code: string; onCancel: () => void }) => {
  const { t } = useTranslation(osTranslations);
  const emoji = hexToEmoji(id);

  return (
    <>
      <p className='text-description'>{t('auth-other-device-emoji.message')}</p>
      {emoji && <Emoji text={emoji} className='mx-auto my-2 text-center' />}
      <p className='text-description'>{t('auth-code.message')}</p>
      <AuthCode code={code} large classNames='mx-auto my-2 text-center grow' />
      <Button variant='ghost' onClick={onCancel}>
        {t('cancel.label')}
      </Button>
    </>
  );
};

const InvitationComplete = ({ succeeded }: { succeeded: boolean }) => {
  return succeeded ? (
    <Icon icon='ph--check--regular' size={6} classNames='m-trim-xs' />
  ) : (
    <Icon icon='ph--x--regular' size={6} classNames='m-trim-xs' />
  );
};

DevicesContainer.displayName = 'DevicesContainer';
