//
// Copyright 2025 DXOS.org
//

import { Check, X } from '@phosphor-icons/react';
import React, { useCallback, useEffect, useState } from 'react';
import { QR } from 'react-qr-rounded';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { useClient, useMulticastObservable } from '@dxos/react-client';
import { type Device, useDevices } from '@dxos/react-client/halo';
import { type CancellableInvitationObservable, Invitation, InvitationEncoder } from '@dxos/react-client/invitations';
import { useNetworkStatus } from '@dxos/react-client/mesh';
import { Button, Clipboard, IconButton, List, useId, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { descriptionText, getSize, mx } from '@dxos/react-ui-theme';
import { AuthCode, Centered, DeviceListItem, Emoji, Label, Viewport } from '@dxos/shell/react';
import { hexToEmoji } from '@dxos/util';

import { ControlGroup, ControlItem, ControlSection } from './ControlSection';
import { CLIENT_PLUGIN } from '../meta';
import { ClientAction } from '../types';

export const DevicesContainer = ({
  createInvitationUrl,
}: {
  createInvitationUrl: (invitationCode: string) => string;
}) => {
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
    <StackItem.Content classNames='p-2 block overflow-y-auto'>
      <ControlSection
        title={t('devices label', { ns: CLIENT_PLUGIN })}
        description={t('devices description', { ns: CLIENT_PLUGIN })}
      >
        <List classNames='container-max-width pli-4'>
          {devices.map((device: Device) => {
            return <DeviceListItem key={device.deviceKey.toHex()} device={device} connectionState={connectionState} />;
          })}
        </List>
        <DeviceInvitation createInvitationUrl={createInvitationUrl} />
      </ControlSection>
      <ControlSection title={t('danger zone title')}>
        <ControlGroup>
          <ControlItem title={t('reset storage label')}>
            <Button onClick={handleResetStorage}>{t('reset storage label')}</Button>
          </ControlItem>
          <ControlItem title={t('recover identity label')}>
            <Button onClick={handleRecover}>{t('recover identity label')}</Button>
          </ControlItem>
          <ControlItem title={t('join new identity label')}>
            <Button onClick={handleJoinNewIdentity}>{t('join new identity label')}</Button>
          </ControlItem>
        </ControlGroup>
      </ControlSection>
    </StackItem.Content>
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
    setInvitation(invitation);
  }, []);

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
  const { t } = useTranslation(CLIENT_PLUGIN);
  const activeView =
    state < 0
      ? 'init'
      : state >= Invitation.State.CANCELLED
        ? 'complete'
        : state >= Invitation.State.READY_FOR_AUTHENTICATION && authCode
          ? 'auth-code'
          : 'qr-code';
  return (
    <Viewport.Root activeView={activeView} classNames='container-max-width pli-4'>
      <Viewport.Views>
        <Viewport.View id='init'>
          <IconButton
            icon='ph--plus--regular'
            label={t('choose add device label', { ns: 'os' })}
            disabled={state >= 0}
            onClick={onInvitationCreate}
          />
        </Viewport.View>
        <Viewport.View id='complete'>
          <InvitationComplete statusValue={state} />
        </Viewport.View>
        <Viewport.View id='auth-code'>
          <InvitationAuthCode id={invitationId} code={authCode ?? 'never'} />
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
    <Clipboard.Provider>
      <div role='none' className={mx(descriptionText, 'is-full max-is-[14rem] relative')}>
        <QR
          rounding={100}
          backgroundColor='transparent'
          color='currentColor'
          className={mx('is-full bs-full p-2')}
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
      <Clipboard.Button variant='ghost' value={url ?? 'never'} />
      <Button onClick={onCancel}>{t('cancel label')}</Button>
    </Clipboard.Provider>
  );
};

const InvitationAuthCode = ({ id, code }: { id: string; code: string }) => {
  const { t } = useTranslation('os');
  const emoji = hexToEmoji(id);

  return (
    <>
      <Label>{t('auth code message')}</Label>
      <AuthCode code={code} large classNames='text-black dark:text-white' />
      <Label>{t('auth other device emoji message')}</Label>
      {emoji && <Emoji text={emoji} />}
    </>
  );
};

const InvitationComplete = ({ statusValue }: { statusValue: number }) => {
  return statusValue > 0 ? <Check className={mx('m-1.5', getSize(6))} /> : <X className={mx('m-1.5', getSize(6))} />;
};
