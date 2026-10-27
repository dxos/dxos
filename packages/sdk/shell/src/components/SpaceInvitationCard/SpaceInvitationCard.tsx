//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type PublicKey } from '@dxos/keys';
import { requirePublicKey } from '@dxos/protocols/buf';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type Contact } from '@dxos/react-client/halo';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Typography from '@dxos/react-ui/Typography';
import type * as Util from '@dxos/react-ui/Util';
import { keyToFallback } from '@dxos/util';

import { translationKey } from '../../translations.ts';
import { profileString } from '../../util/index.ts';
import { contactDisplayName } from '../ContactList/index.ts';

export type SpaceInvitationCardProps = Util.ThemedClassName<{
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
 * A `Card.Section`, so inside a `grid` card its rows keep the card's rails: the avatar in the start rail, the sender
 * and description on the content edge, and the action trailing.
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
  const { t } = Hooks.useTranslation(translationKey);
  const labelId = Hooks.useId('spaceInvitationCard__label');
  const fallback = sender ? keyToFallback(requirePublicKey(sender.identityKey)) : undefined;
  const space = spaceName ?? spaceKey.truncate();
  const description = t('space-invitation.description', { space, role: t(roleLabelKey(role)) });

  return (
    <Card.Section classNames={classNames} data-testid='space-invitation-card'>
      <Card.Row
        leading={
          sender && fallback ? (
            <Avatar.Root
              size='sm'
              aria-labelledby={labelId}
              hue={Avatar.toAvatarHue(profileString(sender, 'hue') ?? fallback.hue)}
              fallback={profileString(sender, 'emoji') ?? fallback.emoji}
            />
          ) : (
            <Icon.Icon icon='ph--envelope-simple--regular' tone='muted' />
          )
        }
        trailing={
          joined ? (
            <Button.Root
              size='sm'
              disabled={pending}
              onClick={() => onOpen?.()}
              data-testid='space-invitation-card.open'
            >
              {t('open-space-invitation.label')}
            </Button.Root>
          ) : (
            <Button.Root
              size='sm'
              variant='primary'
              disabled={pending}
              onClick={() => onJoin?.()}
              data-testid='space-invitation-card.join'
            >
              {t('join-space-invitation.label')}
            </Button.Root>
          )
        }
      >
        <Card.Text id={labelId} truncate>
          {sender ? contactDisplayName(sender) : (senderName ?? t('unknown-sender.label'))}
        </Card.Text>
      </Card.Row>
      {/* No trailing control, so the details run into the end rail. */}
      <Card.Row span='end'>
        <Card.Text variant='muted' lines={3}>
          {sentAt ? `${description} · ${Typography.formatRelative(sentAt)}` : description}
        </Card.Text>
      </Card.Row>
    </Card.Section>
  );
};
