//
// Copyright 2023 DXOS.org
//
import { formatDistanceToNow } from 'date-fns';
import React, { type ComponentPropsWithoutRef, useCallback } from 'react';

import {
  type CancellableInvitationObservable,
  Invitation,
  type InvitationStatus,
  useInvitationStatus,
} from '@dxos/react-client/invitations';
import {
  Avatar,
  type AvatarContentProps,
  Button,
  Clipboard,
  IconButton,
  ListItem,
  type ThemedClassName,
  Tooltip,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';
import { focusRing, getSize, mx } from '@dxos/react-ui-theme';
import { hexToEmoji } from '@dxos/util';

import { AuthCode } from '../AuthCode';

import { type SharedInvitationListProps } from './InvitationListProps';

export type InvitationListItemProps = SharedInvitationListProps & {
  invitation: CancellableInvitationObservable;
  onClickRemove?: (invitation: CancellableInvitationObservable) => void;
  reverseEffects?: boolean;
} & ThemedClassName<ComponentPropsWithoutRef<'li'>>;

export type InvitationListItemImplProps = InvitationListItemProps & {
  invitationStatus: InvitationStatus;
};

export const InvitationListItem = (props: InvitationListItemProps) => {
  const { invitation } = props;
  const invitationStatus = useInvitationStatus(invitation);
  return <InvitationListItemImpl {...props} invitationStatus={invitationStatus} />;
};

const avatarProps: Pick<AvatarContentProps, 'size' | 'variant'> = {
  size: 10,
  variant: 'circle',
};

const AvatarStackEffect = ({
  animation,
  status,
  reverseEffects,
}: Pick<AvatarContentProps, 'status' | 'animation'> & Pick<InvitationListItemProps, 'reverseEffects'>) => {
  const { tx } = useThemeContext();
  return (
    <>
      <span
        role='none'
        className={mx(
          'absolute inline-end-auto opacity-20',
          reverseEffects ? 'inline-start-3' : 'inline-start-1',
          getSize(avatarProps.size!),
        )}
      >
        <span
          role='none'
          className={tx('avatar.ring', 'avatar__ring', {
            ...avatarProps,
            status,
            animation,
          })}
          style={{ animationDelay: '400ms' }}
        />
      </span>
      <span
        role='none'
        className={mx(
          'absolute inline-end-auto opacity-50',
          reverseEffects ? 'inline-start-2' : 'inline-start-2',
          getSize(avatarProps.size!),
        )}
      >
        <span
          role='none'
          className={tx('avatar.ring', 'avatar__ring', {
            ...avatarProps,
            status,
            animation,
          })}
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
  reverseEffects,
  ...props
}: InvitationListItemImplProps) => {
  const { t } = useTranslation('os');
  const { cancel, status: invitationStatus, invitationCode, authCode, multiUse, shareable } = propsInvitationStatus;

  const isCancellable = !(
    [Invitation.State.ERROR, Invitation.State.TIMEOUT, Invitation.State.CANCELLED].indexOf(invitationStatus) >= 0
  );

  const showShare =
    shareable &&
    (multiUse ||
      [Invitation.State.INIT, Invitation.State.CONNECTING, Invitation.State.CONNECTED].indexOf(invitationStatus) >= 0);

  const showAuthCode = invitationStatus === Invitation.State.READY_FOR_AUTHENTICATION;

  const handleClickRemove = useCallback(() => onClickRemove?.(invitation), [invitation, onClickRemove]);

  const invitationUrl = invitationCode && createInvitationUrl(invitationCode);
  const invitationId = invitation?.get().invitationId;
  const invitationHasLifetime = invitation?.get().lifetime;
  const invitationTimeLeft = invitation?.expiry
    ? formatDistanceToNow(invitation?.expiry, { addSuffix: true })
    : undefined;

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
    <ListItem.Root
      id={invitationCode}
      {...props}
      classNames={['flex gap-2 pis-3 pie-1 items-center relative', props.classNames]}
    >
      <ListItem.Heading classNames='sr-only'>
        {t(multiUse ? 'invite many list item label' : 'invite one list item label')}
      </ListItem.Heading>
      {multiUse && (
        <AvatarStackEffect status={avatarStatus} animation={avatarAnimation} reverseEffects={reverseEffects} />
      )}
      <Avatar.Root>
        <Tooltip.Trigger asChild content={t(multiUse ? 'invite many qr label' : 'invite one qr label')} side='left'>
          <Avatar.Content
            {...avatarProps}
            animation={avatarAnimation}
            status={avatarStatus}
            fallback={hexToEmoji(invitationId)}
            tabIndex={0}
            classNames={[focusRing, 'relative rounded-full place-self-center']}
          />
        </Tooltip.Trigger>
      </Avatar.Root>
      {showShare && invitationUrl ? (
        <>
          <Tooltip.Trigger
            asChild
            content={
              invitationHasLifetime ? t('expires label', { timeLeft: invitationTimeLeft }) : t('no expiration label')
            }
          >
            <Button
              variant='ghost'
              classNames='grow justify-start font-medium'
              onClick={() => send({ type: 'selectInvitation', invitation })}
              data-testid='show-qrcode'
            >
              <span>{t('open share panel label')}</span>
            </Button>
          </Tooltip.Trigger>
          <Clipboard.IconButton variant='ghost' value={invitationUrl} />
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
      ) : !shareable ? (
        <span className='pli-2 grow text-neutral-500'>Pending Invitation</span>
      ) : (
        <span className='grow'> </span>
      )}
      {isCancellable ? (
        <IconButton
          icon='ph--x--regular'
          size={4}
          label={t('cancel invitation label')}
          iconOnly
          variant='ghost'
          classNames='flex gap-1 pli-0'
          onClick={cancel}
          data-testid='cancel-invitation'
        />
      ) : (
        <IconButton
          icon='ph--x--regular'
          size={4}
          label={t('remove invitation label')}
          iconOnly
          variant='ghost'
          classNames='flex gap-1 pli-0'
          onClick={handleClickRemove}
          data-testid='remove-invitation'
        />
      )}
    </ListItem.Root>
  );
};
