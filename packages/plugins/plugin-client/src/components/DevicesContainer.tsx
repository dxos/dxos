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
import { descriptionText, getSize, mx } from '@dxos/react-ui-theme';
import { AuthCode, Centered, DeviceListItem, Emoji, Label } from '@dxos/shell/react';
import { hexToEmoji } from '@dxos/util';

import { ClientAction } from '../types';

export const DevicesContainer = ({
  createInvitationUrl,
}: {
  createInvitationUrl: (invitationCode: string) => string;
}) => {
  const { t } = useTranslation('os');
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const [invitation, setInvitation] = useState<CancellableInvitationObservable>();
  const devices = useDevices();
  const { swarm: connectionState } = useNetworkStatus();

  const handleAddDevice = useCallback(() => {
    const invitation = client.halo.share();
    setInvitation(invitation);
  }, []);

  const handleCancelInvitation = useCallback(() => {
    setInvitation(undefined);
  }, []);

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
    <div className='p-4'>
      <div className='flex justify-end'>
        <IconButton
          icon='ph--plus--regular'
          label={t('choose add device label')}
          disabled={!!invitation}
          onClick={handleAddDevice}
        />
      </div>
      {invitation && (
        <InvitationComponent
          invitation={invitation}
          createInvitationUrl={createInvitationUrl}
          onInvitationDone={handleCancelInvitation}
        />
      )}
      {!invitation && (
        <List>
          {devices.map((device: Device) => {
            return <DeviceListItem key={device.deviceKey.toHex()} device={device} connectionState={connectionState} />;
          })}
        </List>
      )}
      {!invitation && (
        <>
          <h2>{t('danger zone title')}</h2>
          <div className='flex gap-2'>
            <Button variant='ghost' onClick={handleResetStorage}>
              {t('reset storage label')}
            </Button>
            <Button variant='ghost' onClick={handleRecover}>
              {t('recover identity label')}
            </Button>
            <Button variant='ghost' onClick={handleJoinNewIdentity}>
              {t('join new identity label')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

const InvitationComponent = ({
  invitation: _invitation,
  createInvitationUrl,
  onInvitationDone,
}: {
  invitation: CancellableInvitationObservable;
  createInvitationUrl: (invitationCode: string) => string;
  onInvitationDone: () => void;
}) => {
  const invitation = useMulticastObservable(_invitation);
  const url = createInvitationUrl(InvitationEncoder.encode(invitation));

  useEffect(() => {
    if (invitation.state >= Invitation.State.SUCCESS) {
      onInvitationDone();
    }
  }, [invitation.state]);

  return invitation.state >= Invitation.State.CANCELLED ? (
    <InvitationComplete statusValue={invitation.state} />
  ) : invitation.state >= Invitation.State.READY_FOR_AUTHENTICATION && invitation.authCode ? (
    <InvitationAuthCode id={invitation.invitationId} code={invitation.authCode} />
  ) : (
    <InvitationQR id={invitation.invitationId} url={url} onCancel={onInvitationDone} />
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
      <IconButton icon='ph--x--regular' label={t('cancel invitation label')} onClick={onCancel} />
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
