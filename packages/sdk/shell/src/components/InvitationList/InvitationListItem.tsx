//
// Copyright 2023 DXOS.org
//

import { formatDistanceToNow } from 'date-fns';
import React, { type ComponentPropsWithoutRef, useCallback } from 'react';

import {
  type CancellableInvitationObservable,
  Invitation_State,
  type InvitationStatus,
  useInvitationStatus,
} from '@dxos/react-client/invitations';
import { Listbox } from '@dxos/react-ui-list';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';
import { hexToEmoji } from '@dxos/util';

import { translationKey } from '../../translations.ts';
import { AuthCode } from '../AuthCode/index.ts';
import { type SharedInvitationListProps } from './InvitationListProps.ts';

export type InvitationListItemProps = SharedInvitationListProps & {
  invitation: CancellableInvitationObservable;
  onClickRemove?: (invitation: CancellableInvitationObservable) => void;
  reverseEffects?: boolean;
} & Util.ThemedClassName<ComponentPropsWithoutRef<'div'>>;

export type InvitationListItemImplProps = InvitationListItemProps & {
  invitationStatus: InvitationStatus;
};

export const InvitationListItem = (props: InvitationListItemProps) => {
  const { invitation } = props;
  const invitationStatus = useInvitationStatus(invitation);
  return <InvitationListItemImpl {...props} invitationStatus={invitationStatus} />;
};

const AVATAR_SIZE = 'lg';

/** Two faded rings behind a multi-use invitation's avatar, so it reads as a stack. */
const AvatarStackEffect = ({
  animation,
  status,
  reverseEffects,
}: Pick<Avatar.RootProps, 'status' | 'animation'> & Pick<InvitationListItemProps, 'reverseEffects'>) => (
  <>
    {[
      { offset: reverseEffects ? 'left-3' : 'left-1', opacity: 'opacity-20', delay: '400ms' },
      { offset: 'left-2', opacity: 'opacity-50', delay: '200ms' },
    ].map(({ offset, opacity, delay }) => (
      <Avatar.Root
        key={delay}
        aria-hidden
        size={AVATAR_SIZE}
        status={status}
        animation={animation}
        hueVariant='transparent'
        classNames={mx('absolute right-auto', offset, opacity)}
        style={{ animationDelay: delay }}
      />
    ))}
  </>
);

export const InvitationListItemImpl = ({
  invitation,
  invitationStatus: propsInvitationStatus,
  send,
  onClickRemove,
  createInvitationUrl,
  reverseEffects,
  ...props
}: InvitationListItemImplProps) => {
  const { t } = Hooks.useTranslation(translationKey);
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
    <Listbox.Item
      id={invitationId}
      {...props}
      classNames={['flex gap-2 ps-3 pe-1 items-center relative', props.classNames]}
    >
      <Listbox.ItemText classNames='sr-only'>
        {t(multiUse ? 'invite-many-list-item.label' : 'invite-one-list-item.label')}
      </Listbox.ItemText>
      {multiUse && (
        <AvatarStackEffect status={avatarStatus} animation={avatarAnimation} reverseEffects={reverseEffects} />
      )}
      <Tooltip.Trigger asChild content={t(multiUse ? 'invite-many-qr.label' : 'invite-one-qr.label')} side='left'>
        <Avatar.Root
          size={AVATAR_SIZE}
          animation={avatarAnimation}
          status={avatarStatus}
          fallback={hexToEmoji(invitationId)}
          label={t(multiUse ? 'invite-many-qr.label' : 'invite-one-qr.label')}
          tabIndex={0}
          classNames={['dx-focus-ring', 'relative rounded-full place-self-center']}
        />
      </Tooltip.Trigger>
      {showShare && invitationUrl ? (
        <>
          <Tooltip.Trigger
            asChild
            content={
              invitationHasLifetime ? t('expires.label', { timeLeft: invitationTimeLeft }) : t('no-expiration.label')
            }
          >
            <Button.Root
              variant='ghost'
              classNames='grow justify-start font-medium'
              data-testid='show-qrcode'
              onClick={() => send({ type: 'selectInvitation', invitation })}
            >
              <span>{t('open-share-panel.label')}</span>
            </Button.Root>
          </Tooltip.Trigger>
          <SystemButton.Clipboard iconOnly variant='ghost' value={invitationUrl} />
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
        <Button.Root
          icon='ph--x--regular'
          iconSize='md'
          label={t('cancel-invitation.label')}
          iconOnly
          variant='ghost'
          classNames='flex gap-1 px-0'
          onClick={cancel}
          data-testid='cancel-invitation'
        />
      ) : (
        <Button.Root
          icon='ph--x--regular'
          iconSize='md'
          label={t('remove-invitation.label')}
          iconOnly
          variant='ghost'
          classNames='flex gap-1 px-0'
          onClick={handleClickRemove}
          data-testid='remove-invitation'
        />
      )}
    </Listbox.Item>
  );
};
