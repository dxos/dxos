//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { generateName } from '@dxos/display-name';
import { requirePublicKey } from '@dxos/protocols/buf';
import { type SpaceMember, SpaceMember_PresenceState } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { Avatar, type ThemedClassName, useId } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { keyToFallback } from '@dxos/util';

import { profileString } from '../../util';

type IdentityListItemProps = {
  identity: Identity;
  presence?: SpaceMember['presence'];
  onClick?: () => void;
};

export const IdentityListItem = forwardRef<
  HTMLLIElement,
  ThemedClassName<ComponentPropsWithoutRef<'li'>> & IdentityListItemProps
>(({ identity, presence, onClick, classNames, ...props }, forwardedRef) => {
  const identityKey = requirePublicKey(identity.identityKey);
  const fallbackValue = keyToFallback(identityKey);
  const labelId = useId('identityListItem__label');
  const displayName = identity.profile?.displayName ?? generateName(identityKey.toHex());
  return (
    <Listbox.Item
      {...props}
      id={identityKey.toHex()}
      classNames={['flex gap-2 ps-3 pe-1 items-center', onClick && 'cursor-pointer', classNames]}
      onClick={onClick && (() => onClick())}
      data-testid='identity-list-item'
      ref={forwardedRef}
    >
      <Avatar.Root labelId={labelId}>
        <Avatar.Content
          status={presence === SpaceMember_PresenceState.ONLINE ? 'active' : 'inactive'}
          hue={profileString(identity, 'hue') ?? fallbackValue.hue}
          fallback={profileString(identity, 'emoji') ?? fallbackValue.emoji}
          classNames='place-self-center'
        />
        <Avatar.Label classNames='text-sm truncate px-2'>{displayName}</Avatar.Label>
      </Avatar.Root>
    </Listbox.Item>
  );
});
