//
// Copyright 2023 DXOS.org
//

import { formatDistanceToNow } from 'date-fns';
import React, { type ComponentPropsWithoutRef, createContext, useCallback, useContext, useEffect } from 'react';

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

/**
 * Lets each row tell its list how to open it (its QR or auth view), so a pick by Enter or a click on the row, which the
 * list reports, reaches the row that knows whether it can be opened.
 */
export const InvitationOpenContext = createContext<(id: string, open: (() => void) | undefined) => void>(() => {});

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

  const canOpen = !!(showShare && invitationUrl);
  const registerOpen = useContext(InvitationOpenContext);
  useEffect(() => {
    registerOpen(invitationId, canOpen ? () => send({ type: 'selectInvitation', invitation }) : undefined);
    return () => registerOpen(invitationId, undefined);
  }, [registerOpen, invitationId, canOpen, send, invitation]);

  const status = canOpen
    ? t('open-share-panel.label')
    : invitationStatus === Invitation_State.CONNECTING
      ? 'Connecting...'
      : invitationStatus === Invitation_State.AUTHENTICATING
        ? 'Authenticating...'
        : invitationStatus === Invitation_State.ERROR || invitationStatus === Invitation_State.TIMEOUT
          ? 'Failed'
          : invitationStatus === Invitation_State.CANCELLED
            ? 'Cancelled'
            : invitationStatus === Invitation_State.SUCCESS
              ? 'User joined'
              : !shareable
                ? 'Pending Invitation'
                : '';

  return (
    <Listbox.Item {...props} id={invitationId}>
      <Listbox.ItemIcon>
        {multiUse && (
          <AvatarStackEffect status={avatarStatus} animation={avatarAnimation} reverseEffects={reverseEffects} />
        )}
        <Tooltip.Trigger asChild content={t(multiUse ? 'invite-many-qr.label' : 'invite-one-qr.label')} side='left'>
          <Avatar.Root
            animation={avatarAnimation}
            status={avatarStatus}
            fallback={hexToEmoji(invitationId)}
            label={t(multiUse ? 'invite-many-qr.label' : 'invite-one-qr.label')}
          />
        </Tooltip.Trigger>
      </Listbox.ItemIcon>
      {canOpen ? (
        <Tooltip.Trigger
          asChild
          content={
            invitationHasLifetime ? t('expires.label', { timeLeft: invitationTimeLeft }) : t('no-expiration.label')
          }
        >
          <Listbox.ItemText data-testid='show-qrcode'>{status}</Listbox.ItemText>
        </Tooltip.Trigger>
      ) : showAuthCode ? (
        <Listbox.ItemText>
          <AuthCode code={authCode} />
        </Listbox.ItemText>
      ) : (
        <Listbox.ItemText tone={invitationStatus === Invitation_State.SUCCESS ? 'default' : 'muted'}>
          {status}
        </Listbox.ItemText>
      )}
      {canOpen && invitationUrl && <SystemButton.Clipboard iconOnly variant='ghost' value={invitationUrl} />}
      <Button.Root
        icon='ph--x--regular'
        iconSize='md'
        label={t(isCancellable ? 'cancel-invitation.label' : 'remove-invitation.label')}
        iconOnly
        variant='ghost'
        onClick={isCancellable ? cancel : handleClickRemove}
        data-testid={isCancellable ? 'cancel-invitation' : 'remove-invitation'}
      />
    </Listbox.Item>
  );
};
