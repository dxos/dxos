//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

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
  const members = useMemo(
    () =>
      includeSelf
        ? allUnsortedMembers.sort((member) =>
            member.identity.identityKey.equals(client.halo.identity.get()!.identityKey) ? -1 : 1,
          )
        : allUnsortedMembers.filter(
            (member) => !member.identity.identityKey.equals(client.halo.identity.get()!.identityKey),
          ),
    [allUnsortedMembers],
  );
  return <SpaceMemberListImpl members={members} onSelect={onSelect} />;
};

export const SpaceMemberListImpl = ({ members, onSelect }: SpaceMemberListImplProps) => {
  const { t } = useTranslation(translationKey);
  const visibleMembers = members.filter((member) => member.identity);
  return visibleMembers.length > 0 ? (
    <List classNames='flex flex-col gap-2' data-testid='space-members-list'>
      {visibleMembers.map((member) => {
        return (
          <IdentityListItem
            key={member.identity.identityKey.toHex()}
            identity={member.identity}
            presence={member.presence}
            onClick={onSelect && (() => onSelect(member))}
          />
        );
      })}
    </List>
  ) : (
    <div role='none' className='grow flex items-center p-2'>
      <p className={mx(descriptionText, 'text-center is-full mlb-2')}>{t('empty space members message')}</p>
    </div>
  );
};
