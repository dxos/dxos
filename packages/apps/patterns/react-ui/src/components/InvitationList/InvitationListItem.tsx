//
// Copyright 2023 DXOS.org
//
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Copy, ProhibitInset, QrCode, X } from 'phosphor-react';
import { QRCodeSVG } from 'qrcode.react';
import React, { useCallback } from 'react';

import { CancellableInvitationObservable } from '@dxos/client';
import { useInvitationStatus } from '@dxos/react-client';
import { Button, getSize, mx, useId, useTranslation } from '@dxos/react-components';

import { invitationStatusValue } from '../../util';
import { SharedInvitationListProps } from './InvitationListProps';
import { InvitationStatusAvatar } from './InvitationStatusAvatar';

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
  const qrLabel = useId('qrLabel');

  const { cancel, status, haltedAt, invitationCode, authenticationCode } = useInvitationStatus(invitation);
  const statusValue = invitationStatusValue.get(status) ?? 0;

  const isCancellable = statusValue < 4 && statusValue >= 0;
  const showShare = statusValue < 3 && statusValue >= 0;
  const showPin = statusValue === 3;

  const handleClickRemove = useCallback(() => onClickRemove(invitation), [invitation, onClickRemove]);

  const invitationUrl = invitationCode && createInvitationUrl(invitationCode);
  const handleClickCopy = useCallback(() => {
    if (invitationUrl) {
      void navigator.clipboard.writeText(invitationUrl);
    }
  }, [invitationUrl]);

  return (
    <AccordionPrimitive.Item value={value}>
      <AccordionPrimitive.Header className='flex gap-2 items-center'>
        <InvitationStatusAvatar {...{ status, haltedAt, size: 8 }} />
        {showShare && invitationUrl ? (
          <>
            <AccordionPrimitive.Trigger asChild>
              <Button className='grow flex gap-1'>
                <span>{t('open share panel label')}</span>
                <QrCode className={getSize(4)} weight='bold' />
              </Button>
            </AccordionPrimitive.Trigger>
            <Button className='flex gap-1' onClick={handleClickCopy}>
              <span className='pli-1'>{t('copy invitation code label')}</span>
              <Copy className={getSize(4)} weight='bold' />
            </Button>
          </>
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
        <AccordionPrimitive.Content className='flex gap-2 is-full radix-state-open:p-1 items-center'>
          <QRCodeSVG
            bgColor='transparent'
            fgColor='currentColor'
            value={invitationUrl}
            className={mx('grow-[2] aspect-square is-24 bs-auto')}
            aria-labelledby={qrLabel}
          />
          <span className='pli-1 flex-1 font-system-normal text-sm text-center' id={qrLabel}>
            {t('qr label')}
          </span>
        </AccordionPrimitive.Content>
      )}
    </AccordionPrimitive.Item>
  );
};
