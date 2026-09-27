//
// Copyright 2026 DXOS.org
//

import { formatDistanceToNow } from 'date-fns';
import React from 'react';

import { type PublicKey } from '@dxos/keys';
import { requirePublicKey } from '@dxos/protocols/buf';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type Contact } from '@dxos/react-client/halo';
import { Avatar, Button, IconButton, type ThemedClassName, useId, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { keyToFallback } from '@dxos/util';

import { translationKey } from '../../translations.ts';
import { profileString } from '../../util/index.ts';
import { contactDisplayName } from '../ContactList/index.ts';

/** A pending invitation to a space, with its sender already resolved from the contact book. */
export type SpaceInvitationEntry = {
  id: string;
  sender: Pick<Contact, 'identityKey' | 'profile'>;
  spaceKey: PublicKey;
  /** Known only when the space is visible locally; the notice itself carries just the key. */
  spaceName?: string;
  role: SpaceMember_Role;
  sentAt: Date;
};

export type SpaceInvitationListProps = ThemedClassName<{
  invitations: SpaceInvitationEntry[];
  /** Ids of invitations with an action in flight; their buttons are disabled. */
  pending?: string[];
  onJoin?: (invitation: SpaceInvitationEntry) => void;
  onDismiss?: (invitation: SpaceInvitationEntry) => void;
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
 * Space invitations received from contacts, newest first, each with Join and Dismiss.
 */
export const SpaceInvitationList = ({
  classNames,
  invitations,
  pending = [],
  onJoin,
  onDismiss,
}: SpaceInvitationListProps) => {
  const { t } = useTranslation(translationKey);
  if (invitations.length === 0) {
    return <p className='text-description text-center my-2'>{t('empty-space-invitations.message')}</p>;
  }

  const sorted = [...invitations].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  return (
    <Listbox.Root>
      <Listbox.Content
        classNames={[classNames, 'flex flex-col gap-2']}
        aria-label={t('space-invitations.label')}
        data-testid='space-invitation-list'
      >
        {sorted.map((invitation) => (
          <SpaceInvitationListItem
            key={invitation.id}
            invitation={invitation}
            disabled={pending.includes(invitation.id)}
            onJoin={onJoin}
            onDismiss={onDismiss}
          />
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};

type SpaceInvitationListItemProps = Pick<SpaceInvitationListProps, 'onJoin' | 'onDismiss'> & {
  invitation: SpaceInvitationEntry;
  disabled?: boolean;
};

const SpaceInvitationListItem = ({ invitation, disabled, onJoin, onDismiss }: SpaceInvitationListItemProps) => {
  const { t } = useTranslation(translationKey);
  const labelId = useId('spaceInvitationListItem__label');
  const fallback = keyToFallback(requirePublicKey(invitation.sender.identityKey));
  const space = invitation.spaceName ?? invitation.spaceKey.truncate();

  return (
    <Listbox.Item classNames='p-2 rounded-sm' id={invitation.id} data-testid='space-invitation-list.item'>
      <Listbox.ItemContent
        icon={
          <Avatar.Root labelId={labelId}>
            <Avatar.Content
              size={8}
              hue={profileString(invitation.sender, 'hue') ?? fallback.hue}
              fallback={profileString(invitation.sender, 'emoji') ?? fallback.emoji}
            />
          </Avatar.Root>
        }
        title={
          <div className='flex items-center justify-between gap-1'>
            <span id={labelId} className='truncate'>
              {contactDisplayName(invitation.sender)}
            </span>
            <div className='flex items-center gap-1'>
              <Button
                density='sm'
                variant='primary'
                disabled={disabled}
                onClick={() => onJoin?.(invitation)}
                data-testid='space-invitation-list.join'
              >
                {t('join-space-invitation.label')}
              </Button>
              <IconButton
                iconOnly
                density='sm'
                variant='ghost'
                icon='ph--x--regular'
                label={t('dismiss-space-invitation.label')}
                disabled={disabled}
                onClick={() => onDismiss?.(invitation)}
                data-testid='space-invitation-list.dismiss'
              />
            </div>
          </div>
        }
        description={
          <span className='text-sm text-description'>
            {t('space-invitation.description', {
              space,
              role: t(roleLabelKey(invitation.role)),
              time: formatDistanceToNow(invitation.sentAt, { addSuffix: true }),
            })}
          </span>
        }
      />
    </Listbox.Item>
  );
};
