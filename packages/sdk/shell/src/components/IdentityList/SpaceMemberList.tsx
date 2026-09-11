//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { toPublicKey } from '@dxos/protocols/buf';
import { type PublicKey, useClient } from '@dxos/react-client';
import type { SpaceMember } from '@dxos/react-client/echo';
import { useMembers } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations.ts';
import { IdentityListItem } from './IdentityListItem.tsx';

// TODO(burdon): Consolidate into single component?

export interface SpaceMemberListImplProps {
  members: SpaceMember[];
  onSelect?: (member: SpaceMember) => void;
}

export interface SpaceMemberListProps extends Partial<SpaceMemberListImplProps> {
  spaceKey: PublicKey;
  includeSelf?: boolean;
}

/** A member whose identity is present, which proto3 optionality does not guarantee. */
type IdentifiedMember = SpaceMember & { identity: NonNullable<SpaceMember['identity']> };

const isIdentified = (member: SpaceMember): member is IdentifiedMember => !!member.identity;

export const SpaceMemberList = ({ spaceKey, includeSelf, onSelect }: SpaceMemberListProps) => {
  const client = useClient();
  const allUnsortedMembers = useMembers(spaceKey);
  const members = useMemo(() => {
    const self = toPublicKey(client.halo.identity.get()?.identityKey);
    const isSelf = (member: SpaceMember) => {
      const identityKey = toPublicKey(member.identity?.identityKey);
      return !!self && !!identityKey && identityKey.equals(self);
    };
    return includeSelf
      ? allUnsortedMembers.sort((member) => (isSelf(member) ? -1 : 1))
      : allUnsortedMembers.filter((member) => !isSelf(member));
  }, [allUnsortedMembers, includeSelf, client]);
  return <SpaceMemberListImpl members={members} onSelect={onSelect} />;
};

export const SpaceMemberListImpl = ({ members, onSelect }: SpaceMemberListImplProps) => {
  const { t } = useTranslation(translationKey);
  const visibleMembers = members.filter(isIdentified);
  return visibleMembers.length > 0 ? (
    <Listbox.Root>
      <Listbox.Content
        classNames='flex flex-col gap-2'
        aria-label={t('space-member-list.heading')}
        data-testid='space-members-list'
      >
        {visibleMembers.map((member) => {
          return (
            <IdentityListItem
              key={toPublicKey(member.identity.identityKey)?.toHex()}
              identity={member.identity}
              presence={member.presence}
              onClick={onSelect && (() => onSelect(member))}
            />
          );
        })}
      </Listbox.Content>
    </Listbox.Root>
  ) : (
    <div className='grow flex items-center p-2'>
      <p className={mx('text-description', 'text-center w-full my-2')}>{t('empty-space-members.message')}</p>
    </div>
  );
};
