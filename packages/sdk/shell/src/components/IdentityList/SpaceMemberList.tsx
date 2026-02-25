//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { decodePublicKey } from '@dxos/protocols/buf';
import { type PublicKey, useClient } from '@dxos/react-client';
import type { SpaceMember } from '@dxos/react-client/echo';
import { useMembers } from '@dxos/react-client/echo';
import { List, useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations';

import { IdentityListItem } from './IdentityListItem';

// TODO(burdon): Consolidate into single component?

export interface SpaceMemberListImplProps {
  members: SpaceMember[];
  onSelect?: (member: SpaceMember) => void;
}

export interface SpaceMemberListProps extends Partial<SpaceMemberListImplProps> {
  spaceKey: PublicKey;
  includeSelf?: boolean;
}

export const SpaceMemberList = ({ spaceKey, includeSelf, onSelect }: SpaceMemberListProps) => {
  const client = useClient();
  const allUnsortedMembers = useMembers(spaceKey);
  const currentIdentityKey = client.halo.identity.get()?.identityKey;
  const currentIdentityKeyPk = currentIdentityKey ? decodePublicKey(currentIdentityKey) : undefined;
  const members = useMemo(
    () =>
      includeSelf && currentIdentityKeyPk
        ? allUnsortedMembers.sort((member) => {
            const memberKey = member.identity?.identityKey;
            if (!memberKey) return 1;
            return decodePublicKey(memberKey).equals(currentIdentityKeyPk) ? -1 : 1;
          })
        : currentIdentityKeyPk
          ? allUnsortedMembers.filter((member) => {
              const memberKey = member.identity?.identityKey;
              if (!memberKey) return true;
              return !decodePublicKey(memberKey).equals(currentIdentityKeyPk);
            })
          : allUnsortedMembers,
    [allUnsortedMembers, currentIdentityKeyPk],
  );
  return <SpaceMemberListImpl members={members} onSelect={onSelect} />;
};

export const SpaceMemberListImpl = ({ members, onSelect }: SpaceMemberListImplProps) => {
  const { t } = useTranslation(translationKey);
  const visibleMembers = members.filter(
    (member): member is SpaceMember & { identity: NonNullable<SpaceMember['identity']> } => !!member.identity,
  );
  return visibleMembers.length > 0 ? (
    <List classNames='flex flex-col gap-2' data-testid='space-members-list'>
      {visibleMembers.map((member) => {
        const keyHex = member.identity.identityKey ? decodePublicKey(member.identity.identityKey).toHex() : 'unknown';
        return (
          <IdentityListItem
            key={keyHex}
            identity={member.identity}
            presence={member.presence}
            onClick={onSelect && (() => onSelect(member))}
          />
        );
      })}
    </List>
  ) : (
    <div role='none' className='grow flex items-center p-2'>
      <p className={mx(descriptionText, 'text-center w-full my-2')}>{t('empty space members message')}</p>
    </div>
  );
};
