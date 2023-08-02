//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/aurora';
import { descriptionText, mx } from '@dxos/aurora-theme';
import type { SpaceMember } from '@dxos/react-client/echo';

import { IdentityListItem } from './IdentityListItem';

export interface SpaceMemberListProps {
  members: SpaceMember[];
  onSelect?: (member: SpaceMember) => void;
}

export const SpaceMemberList = ({ members, onSelect }: SpaceMemberListProps) => {
  const { t } = useTranslation('os');
  const visibleMembers = members.filter((member) => member.identity);
  return visibleMembers.length > 0 ? (
    <ul className='flex flex-col gap-2'>
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
    </ul>
  ) : (
    <div role='none' className='grow flex items-center p-2'>
      <p className={mx(descriptionText, 'text-center is-full')}>{t('empty space members message')}</p>
    </div>
  );
};
