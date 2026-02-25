//
// Copyright 2023 DXOS.org
//
import { formatDistanceToNow } from 'date-fns';
import React, { type ComponentPropsWithoutRef, useCallback } from 'react';

import {
  type CancellableInvitationObservable,
  type InvitationStatus,
  Invitation_State,
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
import { focusRing, getSize, mx } from '@dxos/ui-theme';
import { hexToEmoji } from '@dxos/util';

import { translationKey } from '../../translations';
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
          'absolute right-auto opacity-20',
          reverseEffects ? 'left-3' : 'left-1',
          getSize(avatarProps.size!),
        )}
      >
        <span
          role='none'
          className={tx('avatar.ring', { ...avatarProps, status, animation })}
          style={{ animationDelay: '400ms' }}
        />
      </span>
      <span
        role='none'
        className={mx(
          'absolute right-auto opacity-50',
          reverseEffects ? 'left-2' : 'left-2',
          getSize(avatarProps.size!),
        )}
      >
        <span
          role='none'
          className={tx('avatar.ring', { ...avatarProps, status, animation })}
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
  const { t } = useTranslation(translationKey);
  const { cancel, status: invitationStatus, invitationCode, authCode, multiUse, shareable } = propsInvitationStatus;

  const isCancellable = !(
    [Invitation_State.ERROR, Invitation_State.TIMEOUT, Invitation_State.CANCELLED].indexOf(invitationStatus) >= 0
  );

  const showShare =
    shareable &&
    (multiUse ||
      [Invitation_State.INIT, Invitation_State.CONNECTING, Invitation_State.CONNECTED].indexOf(invitationStatus) >= 0);

  const showAuthCode = invitationStatus === Invitation_State.READY_FOR_AUTHENTICATION;

  const handleClickRemove = useCallback(() => onClickRemove?.(invitation), [invitation, onClickRemove]);

  const invitationUrl = invitationCode && createInvitationUrl(invitationCode);
  const invitationId = invitation?.get().invitationId;
  const invitationHasLifetime = invitation?.get().lifetime;
  const invitationTimeLeft = invitation?.expiry
    ? formatDistanceToNow(invitation?.expiry, { addSuffix: true })
    : undefined;

  const avatarAnimation = [
    Invitation_State.INIT,
    Invitation_State.CONNECTING,
    Invitation_State.CONNECTED,
    Invitation_State.READY_FOR_AUTHENTICATION,
    Invitation_State.AUTHENTICATING,
  ].includes(invitationStatus)
    ? 'pulse'
    : 'none';

  const avatarError = [Invitation_State.ERROR, Invitation_State.TIMEOUT, Invitation_State.CANCELLED].includes(
    invitationStatus,
  );

  const avatarGreen = [
    Invitation_State.CONNECTED,
    Invitation_State.READY_FOR_AUTHENTICATION,
    Invitation_State.AUTHENTICATING,
    Invitation_State.SUCCESS,
  ].includes(invitationStatus);

  const avatarStatus = avatarError ? 'error' : avatarGreen ? 'active' : 'inactive';

  return (
    <ListItem.Root
      id={invitationCode}
      {...props}
      classNames={['flex gap-2 ps-3 pe-1 items-center relative', props.classNames]}
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
      ) : invitationStatus === Invitation_State.CONNECTING ? (
        <span className='px-2 grow text-neutral-500'>Connecting...</span>
      ) : invitationStatus === Invitation_State.AUTHENTICATING ? (
        <span className='px-2 grow text-neutral-500'>Authenticating...</span>
      ) : invitationStatus === Invitation_State.ERROR || invitationStatus === Invitation_State.TIMEOUT ? (
        <span className='px-2 grow text-neutral-500'>Failed</span>
      ) : invitationStatus === Invitation_State.CANCELLED ? (
        <span className='px-2 grow text-neutral-500'>Cancelled</span>
      ) : invitationStatus === Invitation_State.SUCCESS ? (
        <span className='px-2 grow truncate'>User joined</span>
      ) : !shareable ? (
        <span className='px-2 grow text-neutral-500'>Pending Invitation</span>
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
          classNames='flex gap-1 px-0'
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
          classNames='flex gap-1 px-0'
          onClick={handleClickRemove}
          data-testid='remove-invitation'
        />
      )}
    </ListItem.Root>
  );
};
