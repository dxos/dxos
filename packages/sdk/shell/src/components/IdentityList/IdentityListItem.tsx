//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { generateName } from '@dxos/display-name';
import { decodePublicKey } from '@dxos/protocols/buf';
import { SpaceMember_PresenceState } from '@dxos/protocols/buf/dxos/client/services_pb';
import type { SpaceMember } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { Avatar, ListItem, type ThemedClassName, useId } from '@dxos/react-ui';
import { hexToFallback, keyToFallback } from '@dxos/util';

type IdentityListItemProps = {
  identity: Identity;
  presence?: SpaceMember['presence'];
  onClick?: () => void;
};

export const IdentityListItem = forwardRef<
  HTMLLIElement,
  ThemedClassName<ComponentPropsWithoutRef<'li'>> & IdentityListItemProps
>(({ identity, presence, onClick, classNames, ...props }, forwardedRef) => {
  const identityKeyPk = identity.identityKey ? decodePublicKey(identity.identityKey) : undefined;
  const fallbackValue = identityKeyPk ? keyToFallback(identityKeyPk) : hexToFallback('0');
  const labelId = useId('identityListItem__label');
  const displayName =
    identity.profile?.displayName ?? (identityKeyPk ? generateName(identityKeyPk.toHex()) : 'Unknown');
  return (
    <ListItem.Root
      {...props}
      classNames={['flex gap-2 pis-3 pie-1 items-center', onClick && 'cursor-pointer', classNames]}
      onClick={() => onClick?.()}
      data-testid='identity-list-item'
      labelId={labelId}
      ref={forwardedRef}
    >
      <Avatar.Root labelId={labelId}>
        <Avatar.Content
          status={presence === SpaceMember_PresenceState.ONLINE ? 'active' : 'inactive'}
          hue={
            (typeof identity.profile?.data?.hue === 'string' ? identity.profile.data.hue : undefined) ||
            fallbackValue.hue
          }
          fallback={
            (typeof identity.profile?.data?.emoji === 'string' ? identity.profile.data.emoji : undefined) ||
            fallbackValue.emoji
          }
          classNames='place-self-center'
        />
        <Avatar.Label classNames='text-sm truncate pli-2'>{displayName}</Avatar.Label>
      </Avatar.Root>
    </ListItem.Root>
  );
});
