//
// Copyright 2023 DXOS.org
//
import { ProhibitInset, QrCode, X } from '@phosphor-icons/react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { QRCodeSVG } from 'qrcode.react';
import React, { useCallback } from 'react';

import { Button, useId, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { CancellableInvitationObservable } from '@dxos/client';
import { useInvitationStatus } from '@dxos/react-client';

import { invitationStatusValue } from '../../util';
import { CopyButton } from '../Clipboard';
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
  createInvitationUrl,
}: InvitationListItemProps) => {
  const { t } = useTranslation('os');
  const qrLabel = useId('qrLabel');

  const { cancel, status, haltedAt, invitationCode, authCode } = useInvitationStatus(invitation);
  const statusValue = invitationStatusValue.get(status) ?? 0;

  const isCancellable = statusValue < 5 && statusValue >= 0;
  const showShare = statusValue < 3 && statusValue >= 0;
  const showAuthCode = statusValue === 3;

  const handleClickRemove = useCallback(() => onClickRemove(invitation), [invitation, onClickRemove]);

  const invitationUrl = invitationCode && createInvitationUrl(invitationCode);

  return (
    <AccordionPrimitive.Item value={value}>
      <AccordionPrimitive.Header className='flex gap-2 items-center'>
        <InvitationStatusAvatar {...{ status, haltedAt, size: 8, invitationId: invitation?.get().invitationId }} />
        {showShare && invitationUrl ? (
          <>
            <AccordionPrimitive.Trigger asChild>
              <Button classNames='grow flex gap-1' data-testid='show-qrcode'>
                <span>{t('open share panel label')}</span>
                <QrCode className={getSize(4)} weight='bold' />
              </Button>
            </AccordionPrimitive.Trigger>
            <CopyButton value={invitationUrl} />
          </>
        ) : showAuthCode ? (
          <p className='grow text-xl text-center text-success-500 dark:text-success-300 font-mono'>{authCode}</p>
        ) : (
          <span role='none' className='grow' />
        )}
        {isCancellable ? (
          <Button variant='ghost' classNames='flex gap-1' onClick={cancel} data-testid='cancel-invitation'>
            <span className='sr-only'>{t('cancel invitation label')}</span>
            <ProhibitInset className={getSize(4)} weight='bold' />
          </Button>
        ) : (
          <Button variant='ghost' classNames='flex gap-1' onClick={handleClickRemove} data-testid='remove-invitation'>
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
