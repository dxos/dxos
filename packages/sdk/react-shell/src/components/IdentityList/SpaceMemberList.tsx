//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { useTranslation, List } from '@dxos/aurora';
import { descriptionText, mx } from '@dxos/aurora-theme';
import { PublicKey, useClient } from '@dxos/react-client';
import type { SpaceMember } from '@dxos/react-client/echo';
import { useMembers } from '@dxos/react-client/echo';

import { IdentityListItem } from './IdentityListItem';

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
        ? allUnsortedMembers.sort((a) =>
            a.identity.identityKey.equals(client.halo.identity.get()!.identityKey) ? -1 : 1,
          )
        : allUnsortedMembers.filter(
            (member) => !member.identity.identityKey.equals(client.halo.identity.get()!.identityKey),
          ),
    [allUnsortedMembers],
  );
  return <SpaceMemberListImpl members={members} onSelect={onSelect} />;
};

export const SpaceMemberListImpl = ({ members, onSelect }: SpaceMemberListImplProps) => {
  const { t } = useTranslation('os');
  const visibleMembers = members.filter((member) => member.identity);
  return visibleMembers.length > 0 ? (
    <List classNames='flex flex-col gap-2'>
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
