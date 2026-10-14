//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { requirePublicKey, toPublicKey } from '@dxos/protocols/buf';
import { type PublicKey, useClient } from '@dxos/react-client';
import { type SpaceMember, useMembers } from '@dxos/react-client/echo';
import { Listbox } from '@dxos/react-ui-list';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Typography from '@dxos/react-ui/Typography';

import { translationKey } from '../../translations.ts';
import { IdentityListItem, identityDisplayName } from './IdentityListItem.tsx';

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

/** The members as a Listbox: the arrow keys move through the rows, and Enter or a click picks one when `onSelect` is given. */
export const SpaceMemberListImpl = ({ members, onSelect }: SpaceMemberListImplProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const visibleMembers = useMemo(() => members.filter(isIdentified), [members]);
  const items = useMemo(
    () =>
      visibleMembers.map((member) => ({
        value: requirePublicKey(member.identity.identityKey).toHex(),
        label: identityDisplayName(member.identity),
      })),
    [visibleMembers],
  );
  if (visibleMembers.length === 0) {
    return <Typography.Text tone='muted'>{t('empty-space-members.message')}</Typography.Text>;
  }

  // Held at no value, so picking the same member again still reports it.
  const selection = onSelect && {
    value: '',
    onValueChange: (value: string) => {
      const member = visibleMembers.find((member) => requirePublicKey(member.identity.identityKey).toHex() === value);
      if (member) {
        onSelect(member);
      }
    },
  };
  return (
    <Listbox.Root items={items} {...selection}>
      <Listbox.Content aria-label={t('space-member-list.heading')} data-testid='space-members-list'>
        {visibleMembers.map((member) => (
          <IdentityListItem
            key={requirePublicKey(member.identity.identityKey).toHex()}
            identity={member.identity}
            presence={member.presence}
          />
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};
