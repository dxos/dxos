//
// Copyright 2023 DXOS.org
//
import { X } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { Button, ListItem, useTranslation, Avatar } from '@dxos/aurora';
import { chromeSurface, getSize } from '@dxos/aurora-theme';
import {
  type CancellableInvitationObservable,
  Invitation,
  type InvitationStatus,
  useInvitationStatus,
} from '@dxos/react-client/invitations';

import { type SharedInvitationListProps } from './InvitationListProps';
import { toEmoji } from '../../util';
import { AuthCode } from '../AuthCode';
import { CopyButtonIconOnly } from '../Clipboard';

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
  const { cancel, status, invitationCode, authCode } = invitationStatus;

  const isCancellable = !(
    [Invitation.State.ERROR, Invitation.State.TIMEOUT, Invitation.State.CANCELLED].indexOf(status) >= 0
  );

  const showShare =
    [Invitation.State.INIT, Invitation.State.CONNECTING, Invitation.State.CONNECTED].indexOf(status) >= 0;

  const showAuthCode = status === Invitation.State.READY_FOR_AUTHENTICATION;

  const handleClickRemove = useCallback(() => onClickRemove?.(invitation), [invitation, onClickRemove]);

  const invitationUrl = invitationCode && createInvitationUrl(invitationCode);
  const invitationId = invitation?.get().invitationId;

  const avatarAnimation = [
    Invitation.State.INIT,
    Invitation.State.CONNECTING,
    Invitation.State.CONNECTED,
    Invitation.State.READY_FOR_AUTHENTICATION,
    Invitation.State.AUTHENTICATING,
  ].includes(status);

  const avatarError = [Invitation.State.ERROR, Invitation.State.TIMEOUT, Invitation.State.CANCELLED].includes(status);

  const avatarGreen = [
    Invitation.State.CONNECTED,
    Invitation.State.READY_FOR_AUTHENTICATION,
    Invitation.State.AUTHENTICATING,
    Invitation.State.SUCCESS,
  ].includes(status);

  return (
    <ListItem.Root id={invitationCode} classNames={['rounded p-2 flex gap-2 items-center', chromeSurface]}>
      <ListItem.Heading classNames='sr-only'>
        {t('invitation heading') /* todo(thure): Make this more accessible. */}
      </ListItem.Heading>
      <Avatar.Root
        animation={avatarAnimation ? 'pulse' : 'none'}
        status={avatarError ? 'error' : avatarGreen ? 'active' : 'inactive'}
      >
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
        <span className='flex grow'>
          <AuthCode code={authCode} />
        </span>
      ) : status === Invitation.State.CONNECTING ? (
        <span className='pli-2 grow text-neutral-500'>Connecting...</span>
      ) : status === Invitation.State.AUTHENTICATING ? (
        <span className='pli-2 grow text-neutral-500'>Authenticating...</span>
      ) : status === Invitation.State.ERROR || status === Invitation.State.TIMEOUT ? (
        <span className='pli-2 grow text-neutral-500'>Failed</span>
      ) : status === Invitation.State.CANCELLED ? (
        <span className='pli-2 grow text-neutral-500'>Cancelled</span>
      ) : status === Invitation.State.SUCCESS ? (
        <span className='pli-2 grow truncate'>User joined</span>
      ) : (
        <span className='grow'> </span>
      )}
      {isCancellable ? (
        <Button variant='ghost' classNames='flex gap-1' onClick={cancel} data-testid='cancel-invitation'>
          <span className='sr-only'>{t('cancel invitation label')}</span>
          <X className={getSize(5)} weight='bold' />
        </Button>
      ) : (
        <Button variant='ghost' classNames='flex gap-1' onClick={handleClickRemove} data-testid='remove-invitation'>
          <span className='sr-only'>{t('remove invitation label')}</span>
          <X className={getSize(5)} weight='bold' />
        </Button>
      )}
    </ListItem.Root>
  );
};
