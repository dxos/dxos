//
// Copyright 2023 DXOS.org
//
import { ProhibitInset, QrCode, X } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { Button, ListItem, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { CancellableInvitationObservable, useInvitationStatus } from '@dxos/react-client/invitations';

import { invitationStatusValue } from '../../util';
import { CopyButton } from '../Clipboard';
import { SharedInvitationListProps } from './InvitationListProps';
import { InvitationStatusAvatar } from './InvitationStatusAvatar';

export interface InvitationListItemProps extends SharedInvitationListProps {
  invitation: CancellableInvitationObservable;
  onClickRemove: (invitation: CancellableInvitationObservable) => void;
}

export const InvitationListItem = ({
  invitation,
  send,
  onClickRemove,
  createInvitationUrl,
}: InvitationListItemProps) => {
  const { t } = useTranslation('os');
  const { cancel, status, haltedAt, invitationCode, authCode } = useInvitationStatus(invitation);
  const statusValue = invitationStatusValue.get(status) ?? 0;

  const isCancellable = statusValue < 5 && statusValue >= 0;
  const showShare = statusValue < 3 && statusValue >= 0;
  const showAuthCode = statusValue === 3;

  const handleClickRemove = useCallback(() => onClickRemove(invitation), [invitation, onClickRemove]);

  const invitationUrl = invitationCode && createInvitationUrl(invitationCode);

  return (
    <ListItem.Root id={invitationCode}>
      <ListItem.Heading classNames='flex gap-2 items-center'>
        <InvitationStatusAvatar {...{ status, haltedAt, size: 8, invitationId: invitation?.get().invitationId }} />
        {showShare && invitationUrl ? (
          <>
            <Button
              classNames='grow flex gap-1'
              onClick={() => send({ type: 'selectInvitation', invitation })}
              data-testid='show-qrcode'
            >
              <span>{t('open share panel label')}</span>
              <QrCode className={getSize(4)} weight='bold' />
            </Button>
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
      </ListItem.Heading>
    </ListItem.Root>
  );
};
