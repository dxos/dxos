//
// Copyright 2023 DXOS.org
//
import { X } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import {
  type CancellableInvitationObservable,
  Invitation,
  type InvitationStatus,
  useInvitationStatus,
} from '@dxos/react-client/invitations';
import {
  Button,
  ListItem,
  useTranslation,
  Avatar,
  useThemeContext,
  type AvatarRootProps,
  Tooltip,
} from '@dxos/react-ui';
import { focusRing, getSize, mx } from '@dxos/react-ui-theme';

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

const avatarProps: Pick<AvatarRootProps, 'size' | 'variant'> = { size: 10, variant: 'circle' };

const AvatarStackEffect = ({ animation, status }: Pick<AvatarRootProps, 'status' | 'animation'>) => {
  const { tx } = useThemeContext();
  return (
    <>
      <span
        role='none'
        className={mx('absolute inline-start-1 inline-end-auto opacity-20', getSize(avatarProps.size!))}
      >
        <span
          role='none'
          className={tx('avatar.ring', 'avatar__ring', { ...avatarProps, status, animation })}
          style={{ animationDelay: '400ms' }}
        />
      </span>
      <span
        role='none'
        className={mx('absolute inline-start-2 inline-end-auto opacity-50', getSize(avatarProps.size!))}
      >
        <span
          role='none'
          className={tx('avatar.ring', 'avatar__ring', { ...avatarProps, status, animation })}
          style={{ animationDelay: '200ms' }}
        />
      </span>
    </>
  );
};

export const InvitationListItemImpl = ({
  invitation,
  invitationStatus: propsInvitationStatus,
  send,
  onClickRemove,
  createInvitationUrl,
}: InvitationListItemImplProps) => {
  const { t } = useTranslation('os');
  const { cancel, status: invitationStatus, invitationCode, authCode, type } = propsInvitationStatus;

  const isCancellable = !(
    [Invitation.State.ERROR, Invitation.State.TIMEOUT, Invitation.State.CANCELLED].indexOf(invitationStatus) >= 0
  );

  const showShare =
    type === Invitation.Type.MULTIUSE ||
    [Invitation.State.INIT, Invitation.State.CONNECTING, Invitation.State.CONNECTED].indexOf(invitationStatus) >= 0;

  const showAuthCode = invitationStatus === Invitation.State.READY_FOR_AUTHENTICATION;

  const handleClickRemove = useCallback(() => onClickRemove?.(invitation), [invitation, onClickRemove]);

  const invitationUrl = invitationCode && createInvitationUrl(invitationCode);
  const invitationId = invitation?.get().invitationId;

  const avatarAnimation = [
    Invitation.State.INIT,
    Invitation.State.CONNECTING,
    Invitation.State.CONNECTED,
    Invitation.State.READY_FOR_AUTHENTICATION,
    Invitation.State.AUTHENTICATING,
  ].includes(invitationStatus)
    ? 'pulse'
    : 'none';

  const avatarError = [Invitation.State.ERROR, Invitation.State.TIMEOUT, Invitation.State.CANCELLED].includes(
    invitationStatus,
  );

  const avatarGreen = [
    Invitation.State.CONNECTED,
    Invitation.State.READY_FOR_AUTHENTICATION,
    Invitation.State.AUTHENTICATING,
    Invitation.State.SUCCESS,
  ].includes(invitationStatus);

  const avatarStatus = avatarError ? 'error' : avatarGreen ? 'active' : 'inactive';

  return (
    <ListItem.Root id={invitationCode} classNames='flex gap-2 pis-3 pie-1 items-center relative'>
      <ListItem.Heading classNames='sr-only'>
        {t(type === Invitation.Type.MULTIUSE ? 'invite many list item label' : 'invite one list item label')}
      </ListItem.Heading>
      {type === Invitation.Type.MULTIUSE && <AvatarStackEffect status={avatarStatus} animation={avatarAnimation} />}
      <Tooltip.Root>
        <Avatar.Root {...avatarProps} animation={avatarAnimation} status={avatarStatus}>
          <Tooltip.Trigger asChild>
            <Avatar.Frame tabIndex={0} classNames={[focusRing, 'relative rounded-full']}>
              <Avatar.Fallback text={toEmoji(invitationId)} />
            </Avatar.Frame>
          </Tooltip.Trigger>
        </Avatar.Root>
        <Tooltip.Portal>
          <Tooltip.Content side='left' classNames='z-[70]'>
            {t(type === Invitation.Type.MULTIUSE ? 'invite many qr label' : 'invite one qr label')}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      {showShare && invitationUrl ? (
        <>
          <Button
            variant='ghost'
            classNames='grow justify-start font-medium'
            onClick={() => send({ type: 'selectInvitation', invitation })}
            data-testid='show-qrcode'
          >
            <span>{t('open share panel label')}</span>
          </Button>
          <CopyButtonIconOnly variant='ghost' value={invitationUrl} />
        </>
      ) : showAuthCode ? (
        <AuthCode code={authCode} classNames='grow' />
      ) : invitationStatus === Invitation.State.CONNECTING ? (
        <span className='pli-2 grow text-neutral-500'>Connecting...</span>
      ) : invitationStatus === Invitation.State.AUTHENTICATING ? (
        <span className='pli-2 grow text-neutral-500'>Authenticating...</span>
      ) : invitationStatus === Invitation.State.ERROR || invitationStatus === Invitation.State.TIMEOUT ? (
        <span className='pli-2 grow text-neutral-500'>Failed</span>
      ) : invitationStatus === Invitation.State.CANCELLED ? (
        <span className='pli-2 grow text-neutral-500'>Cancelled</span>
      ) : invitationStatus === Invitation.State.SUCCESS ? (
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
