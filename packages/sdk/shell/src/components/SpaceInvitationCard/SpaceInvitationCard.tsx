//
// Copyright 2026 DXOS.org
//

import { formatDistanceToNow } from 'date-fns';
import React from 'react';

import { type PublicKey } from '@dxos/keys';
import { requirePublicKey } from '@dxos/protocols/buf';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type Contact } from '@dxos/react-client/halo';
import { Avatar, Button, Icon, type ThemedClassName, toAvatarHue, useId, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { keyToFallback } from '@dxos/util';

import { translationKey } from '../../translations.ts';
import { profileString } from '../../util/index.ts';
import { contactDisplayName } from '../ContactList/index.ts';

export type SpaceInvitationCardProps = ThemedClassName<{
  /** The inviter, when they are in the contact book. */
  sender?: Pick<Contact, 'identityKey' | 'profile'>;
  /** Shown when the inviter is not a known contact. */
  senderName?: string;
  spaceKey: PublicKey;
  /** Supplied by the inviter, since the recipient cannot read the space until they join. */
  spaceName?: string;
  role: SpaceMember_Role;
  sentAt?: Date;
  /** Whether this identity has already joined the space; the action then opens it instead. */
  joined?: boolean;
  /** An action is in flight; the button is disabled. */
  pending?: boolean;
  onJoin?: () => void;
  onOpen?: () => void;
}>;

const roleLabelKey = (role: SpaceMember_Role): string => {
  switch (role) {
    case SpaceMember_Role.OWNER:
      return 'invitation-role-owner.label';
    case SpaceMember_Role.ADMIN:
      return 'invitation-role-admin.label';
    case SpaceMember_Role.READER:
      return 'invitation-role-reader.label';
    default:
      return 'invitation-role-editor.label';
  }
};

/**
 * An invitation from a contact to a space this identity has been admitted to, with Join (or Open once joined).
 */
export const SpaceInvitationCard = ({
  classNames,
  sender,
  senderName,
  spaceKey,
  spaceName,
  role,
  sentAt,
  joined,
  pending,
  onJoin,
  onOpen,
}: SpaceInvitationCardProps) => {
  const { t } = useTranslation(translationKey);
  const labelId = useId('spaceInvitationCard__label');
  const fallback = sender ? keyToFallback(requirePublicKey(sender.identityKey)) : undefined;
  const space = spaceName ?? spaceKey.truncate();
  const description = t('space-invitation.description', { space, role: t(roleLabelKey(role)) });

  return (
    <div
      role='group'
      aria-labelledby={labelId}
      className={mx('flex flex-wrap items-center gap-2 p-2 min-w-0', classNames)}
      data-testid='space-invitation-card'
    >
      {sender && fallback ? (
        <Avatar.Root
          aria-labelledby={labelId}
          size='md'
          hue={toAvatarHue(profileString(sender, 'hue') ?? fallback.hue)}
          fallback={profileString(sender, 'emoji') ?? fallback.emoji}
        />
      ) : (
        <Icon icon='ph--envelope-simple--regular' size='lg' tone='muted' />
      )}
      {/* The sender over the space and role; its minimum width is where the button wraps under it in a narrow host. */}
      <div className='flex flex-col gap-1 min-w-24 basis-0 grow'>
        <span id={labelId} className='truncate'>
          {sender ? contactDisplayName(sender) : (senderName ?? t('unknown-sender.label'))}
        </span>
        <span className='text-sm text-fg-muted break-words'>
          {sentAt ? `${description} · ${formatDistanceToNow(sentAt, { addSuffix: true })}` : description}
        </span>
      </div>
      {joined ? (
        <Button
          size='sm'
          classNames='ms-auto'
          disabled={pending}
          onClick={() => onOpen?.()}
          data-testid='space-invitation-card.open'
        >
          {t('open-space-invitation.label')}
        </Button>
      ) : (
        <Button
          size='sm'
          variant='primary'
          classNames='ms-auto'
          disabled={pending}
          onClick={() => onJoin?.()}
          data-testid='space-invitation-card.join'
        >
          {t('join-space-invitation.label')}
        </Button>
      )}
    </div>
  );
};
