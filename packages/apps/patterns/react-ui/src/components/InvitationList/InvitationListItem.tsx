//
// Copyright 2023 DXOS.org
//
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Copy, ProhibitInset, QrCode, X } from 'phosphor-react';
import { QRCodeSVG } from 'qrcode.react';
import React, { useCallback } from 'react';

import { Invitation, CancellableInvitationObservable } from '@dxos/client';
import { useInvitationStatus } from '@dxos/react-client';
import { Button, getSize, mx, useTranslation } from '@dxos/react-components';

import { SharedInvitationListProps } from './InvitationListProps';
import { InvitationStatusAvatar } from './InvitationStatusAvatar';

const statusValueMap = new Map<Invitation.State, number>([
  [Invitation.State.ERROR, -3],
  [Invitation.State.TIMEOUT, -2],
  [Invitation.State.CANCELLED, -1],
  [Invitation.State.INIT, 0],
  [Invitation.State.CONNECTING, 1],
  [Invitation.State.CONNECTED, 2],
  [Invitation.State.AUTHENTICATING, 3],
  [Invitation.State.SUCCESS, 4]
]);

export interface InvitationListItemProps extends SharedInvitationListProps {
  invitation: CancellableInvitationObservable;
  value: string;
  onClickRemove: (invitation: CancellableInvitationObservable) => void;
}

export const InvitationListItem = ({
  invitation,
  value,
  onClickRemove,
  createInvitationUrl
}: InvitationListItemProps) => {
  const { t } = useTranslation('os');

  const { cancel, status, haltedAt, invitationCode, authenticationCode } = useInvitationStatus(invitation);
  const statusValue = statusValueMap.get(status) ?? 0;

  const isCancellable = statusValue < 4 && statusValue >= 0;
  const showShare = statusValue < 3 && statusValue >= 0;
  const showPin = statusValue === 3;

  const handleClickRemove = useCallback(() => onClickRemove(invitation), [invitation, onClickRemove]);

  const invitationUrl = invitationCode && createInvitationUrl(invitationCode);
  const handleCLickCopy = useCallback(() => {
    if (invitationUrl) {
      void navigator.clipboard.writeText(invitationUrl);
    }
  }, [invitationUrl]);

  return (
    <AccordionPrimitive.Item value={value}>
      <AccordionPrimitive.Header className='flex gap-2 items-center'>
        <InvitationStatusAvatar {...{ status, haltedAt }} />
        {showShare && invitationUrl ? (
          <AccordionPrimitive.Trigger asChild>
            <Button className='grow flex gap-1'>
              <span>{t('open share panel label')}</span>
              <QrCode className={getSize(4)} weight='bold' />
            </Button>
          </AccordionPrimitive.Trigger>
        ) : showPin ? (
          <p className='grow text-xl text-center text-success-500 dark:text-success-300 font-mono'>
            {authenticationCode}
          </p>
        ) : (
          <span role='none' className='grow' />
        )}
        {isCancellable ? (
          <Button variant='ghost' compact className='flex gap-1' onClick={cancel}>
            <span className='sr-only'>{t('cancel invitation label')}</span>
            <ProhibitInset className={getSize(4)} weight='bold' />
          </Button>
        ) : (
          <Button variant='ghost' compact className='flex gap-1' onClick={handleClickRemove}>
            <span className='sr-only'>{t('remove invitation label')}</span>
            <X className={getSize(4)} weight='bold' />
          </Button>
        )}
      </AccordionPrimitive.Header>
      {showShare && invitationUrl && (
        <AccordionPrimitive.Content>
          <Button className='flex gap-2 is-full p-2' onClick={handleCLickCopy}>
            <QRCodeSVG
              bgColor='transparent'
              fgColor='currentColor'
              value={invitationUrl}
              className={mx('grow aspect-square is-24 bs-auto')}
            />
            <span className='pli-1'>
              {t('copy invitation code label')}
              <Copy className={mx(getSize(4), 'inline mis-1')} weight='bold' />
            </span>
          </Button>
        </AccordionPrimitive.Content>
      )}
    </AccordionPrimitive.Item>
  );
};
