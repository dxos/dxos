//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { QR } from 'react-qr-rounded';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { useClient, useMulticastObservable } from '@dxos/react-client';
import { type Device, useDevices } from '@dxos/react-client/halo';
import { type CancellableInvitationObservable, Invitation, InvitationEncoder } from '@dxos/react-client/invitations';
import { useNetworkStatus } from '@dxos/react-client/mesh';
import { Button, Clipboard, Icon, IconButton, List, useId, useTranslation } from '@dxos/react-ui';
import {
  ControlFrame,
  ControlFrameItem,
  ControlGroup,
  ControlItem,
  ControlPage,
  ControlSection,
} from '@dxos/react-ui-form';
import { AuthCode, Centered, DeviceListItem, Emoji, Viewport } from '@dxos/shell/react';
import { hexToEmoji } from '@dxos/util';

import { meta } from '../meta';
import { ClientAction } from '../types';

export type DevicesContainerProps = {
  createInvitationUrl?: (invitationCode: string) => string;
};

export const DevicesContainer = ({ createInvitationUrl }: DevicesContainerProps) => {
  const { t } = useTranslation('os');
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const devices = useDevices();
  const { swarm: connectionState } = useNetworkStatus();

  const handleResetStorage = useCallback(() => dispatch(createIntent(ClientAction.ResetStorage)), [dispatch]);

  const handleRecover = useCallback(
    () => dispatch(createIntent(ClientAction.ResetStorage, { mode: 'recover' })),
    [dispatch],
  );

  const handleJoinNewIdentity = useCallback(
    () => dispatch(createIntent(ClientAction.ResetStorage, { mode: 'join new identity' })),
    [dispatch],
  );

  return (
    <Clipboard.Provider>
      <ControlPage>
        <ControlSection
          title={t('devices verbose label', { ns: meta.id })}
          description={t('devices description', { ns: meta.id })}
        >
          <ControlFrame>
            <ControlFrameItem title={t('devices label', { ns: meta.id })}>
              <List>
                {devices.map((device: Device) => {
                  return (
                    <DeviceListItem key={device.deviceKey.toHex()} device={device} connectionState={connectionState} />
                  );
                })}
              </List>
            </ControlFrameItem>
            {createInvitationUrl && (
              <ControlFrameItem title='Add device'>
                <DeviceInvitation createInvitationUrl={createInvitationUrl} />
              </ControlFrameItem>
            )}
          </ControlFrame>
        </ControlSection>
        <ControlSection
          title={t('danger zone title', { ns: meta.id })}
          description={t('danger zone description', { ns: meta.id })}
        >
          <ControlGroup>
            <ControlItem title={t('reset device label')} description={t('reset device description', { ns: meta.id })}>
              <Button variant='destructive' onClick={handleResetStorage} data-testid='devicesContainer.reset'>
                {t('reset device label')}
              </Button>
            </ControlItem>
            <ControlItem
              title={t('recover identity label')}
              description={t('recover identity description', { ns: meta.id })}
            >
              <Button variant='destructive' onClick={handleRecover} data-testid='devicesContainer.recover'>
                {t('recover identity label')}
              </Button>
            </ControlItem>
            <ControlItem
              title={t('join new identity label')}
              description={t('join new identity description', { ns: meta.id })}
            >
              <Button variant='destructive' onClick={handleJoinNewIdentity} data-testid='devicesContainer.joinExisting'>
                {t('join new identity label')}
              </Button>
            </ControlItem>
          </ControlGroup>
        </ControlSection>
      </ControlPage>
    </Clipboard.Provider>
  );
};

type DeviceInvitationProps = {
  invitation?: CancellableInvitationObservable;
  createInvitationUrl: (invitationCode: string) => string;
  onInvitationDone: () => void;
  onInvitationCreate: () => void;
};

const DeviceInvitation = (props: Pick<DeviceInvitationProps, 'createInvitationUrl'>) => {
  const client = useClient();
  const [invitation, setInvitation] = useState<CancellableInvitationObservable>();

  const onInvitationCreate = useCallback(() => {
    const invitation = client.halo.share();
    if (client.config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'production') {
      const subscription = invitation.subscribe((invitation: Invitation) => {
        const invitationCode = InvitationEncoder.encode(invitation);
        if (invitation.state === Invitation.State.CONNECTING) {
          log.info(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
          subscription.unsubscribe();
        }
      });
    }
    setInvitation(invitation);
  }, [client]);

  const onInvitationDone = useCallback(() => {
    setInvitation(undefined);
  }, []);

  if (invitation) {
    return <DeviceInvitationImpl {...props} {...{ invitation, onInvitationCreate, onInvitationDone }} />;
  } else {
    return <InvitationSection {...props} {...{ onInvitationCreate, onInvitationDone }} />;
  }
};

const DeviceInvitationImpl = ({
  invitation: invitationObservable,
  createInvitationUrl,
  onInvitationDone,
  onInvitationCreate,
}: DeviceInvitationProps) => {
  const invitation = useMulticastObservable(invitationObservable!);
  const url = createInvitationUrl(InvitationEncoder.encode(invitation));

  useEffect(() => {
    if (invitation.state >= Invitation.State.SUCCESS) {
      onInvitationDone();
    }
  }, [invitation.state]);

  return <InvitationSection {...invitation} {...{ url, onInvitationDone, onInvitationCreate }} />;
};

type InvitationComponentProps = Partial<
  Pick<Invitation, 'authCode' | 'invitationId'> &
    Pick<DeviceInvitationProps, 'onInvitationDone' | 'onInvitationCreate'> & {
      state: number;
      url: string;
    }
>;

const InvitationSection = ({
  state = -1,
  authCode,
  invitationId = 'never',
  url = 'never',
  onInvitationDone = () => {},
  onInvitationCreate = () => {},
}: InvitationComponentProps) => {
  const { t } = useTranslation(meta.id);
  const activeView =
    state < 0
      ? 'init'
      : state >= Invitation.State.CANCELLED
        ? 'complete'
        : state >= Invitation.State.READY_FOR_AUTHENTICATION && authCode
          ? 'auth-code'
          : 'qr-code';
  return activeView === 'init' ? (
    <>
      <p className='text-description mbe-2'>{t('add device description')}</p>
      <IconButton
        icon='ph--plus--regular'
        label={t('create device invitation label')}
        disabled={state >= 0}
        classNames='is-full'
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
          <InvitationComplete statusValue={state} />
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
  const { t } = useTranslation('os');
  const qrLabel = useId('devices-container__qr-code');
  const emoji = hexToEmoji(id);
  return (
    <>
      <p className='text-description'>{t('qr code description', { ns: meta.id })}</p>
      <div role='group' className='grid grid-cols-[1fr_min-content] mlb-2 gap-2'>
        <div role='none' className='is-full aspect-square relative text-description'>
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
        <span id={qrLabel} className='sr-only'>
          {t('qr label')}
        </span>
      </div>
      {/* TODO(burdon): Factor out button bar */}
      <div className='flex justify-center'>
        <div className='flex gap-2'>
          <Clipboard.Button value={url ?? 'never'} />
          <Button variant='ghost' onClick={onCancel}>
            {t('cancel label')}
          </Button>
        </div>
      </div>
    </>
  );
};

const InvitationAuthCode = ({ id, code, onCancel }: { id: string; code: string; onCancel: () => void }) => {
  const { t } = useTranslation('os');
  const emoji = hexToEmoji(id);

  return (
    <>
      <p className='text-description'>{t('auth other device emoji message')}</p>
      {emoji && <Emoji text={emoji} className='mli-auto mlb-2 text-center' />}
      <p className='text-description'>{t('auth code message')}</p>
      <AuthCode code={code} large classNames='mli-auto mlb-2 text-center grow' />
      <Button variant='ghost' onClick={onCancel}>
        {t('cancel label')}
      </Button>
    </>
  );
};

const InvitationComplete = ({ statusValue }: { statusValue: number }) => {
  return statusValue > 0 ? (
    <Icon icon='ph--check--regular' size={6} classNames='m-1.5' />
  ) : (
    <Icon icon='ph--x--regular' size={6} classNames='m-1.5' />
  );
};
