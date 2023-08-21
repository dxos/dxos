//
// Copyright 2023 DXOS.org
//
import { ProhibitInset, X } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { Button, ListItem, useTranslation, Avatar } from '@dxos/aurora';
import { chromeSurface, getSize } from '@dxos/aurora-theme';
import { CancellableInvitationObservable, InvitationStatus, useInvitationStatus } from '@dxos/react-client/invitations';

import { invitationStatusValue, toEmoji } from '../../util';
import { CopyButtonIconOnly } from '../Clipboard';
import { SharedInvitationListProps } from './InvitationListProps';

export interface InvitationListItemProps extends SharedInvitationListProps {
  invitation: CancellableInvitationObservable;
  onClickRemove?: (invitation: CancellableInvitationObservable) => void;
}

export interface InvitationListItemImplProps extends InvitationListItemProps {
  invitationStatus: InvitationStatus;
}

export const InvitationListItem = (props: InvitationListItemProps) => {
  const { invitation } = props;
  const invitationStatus = useInvitationStatus(invitation);
  return <InvitationListItemImpl {...props} invitationStatus={invitationStatus} />;
};

export const InvitationListItemImpl = ({
  invitation,
  invitationStatus,
  send,
  onClickRemove,
  createInvitationUrl,
}: InvitationListItemImplProps) => {
  const { t } = useTranslation('os');
  const { cancel, status, haltedAt, invitationCode, authCode } = invitationStatus;
  const statusValue = invitationStatusValue.get(status) ?? 0;

  const isCancellable = statusValue < 5 && statusValue >= 0;
  const showShare = statusValue < 3 && statusValue >= 0;
  const showAuthCode = statusValue === 3;

  const handleClickRemove = useCallback(() => onClickRemove?.(invitation), [invitation, onClickRemove]);

  const invitationUrl = invitationCode && createInvitationUrl(invitationCode);
  const invitationId = invitation?.get().invitationId;
  return (
    <ListItem.Root id={invitationCode} classNames={['rounded p-2 flex gap-2 items-center', chromeSurface]}>
      <ListItem.Heading classNames='sr-only'>
        {t('invitation heading') /* todo(thure): Make this more accessible. */}
      </ListItem.Heading>
      {/* <InvitationStatusAvatar {...{ status, haltedAt, size: 8, invitationId: invitation?.get().invitationId }} /> */}
      <Avatar.Root status='pending'>
        <Avatar.Frame>
          <Avatar.Fallback text={toEmoji(invitationId)} />
        </Avatar.Frame>
      </Avatar.Root>
      {showShare && invitationUrl ? (
        <>
          <Button
            variant='ghost'
            classNames='grow justify-start'
            onClick={() => send({ type: 'selectInvitation', invitation })}
            data-testid='show-qrcode'
          >
            <span>{t('open share panel label')}</span>
          </Button>
          <CopyButtonIconOnly variant='ghost' value={invitationUrl} />
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
    </ListItem.Root>
  );
};
