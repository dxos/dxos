//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { generateName } from '@dxos/display-name';
import { SpaceMember } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { ListItem, Avatar, useId, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { keyToFallback } from '@dxos/util';

type IdentityListItemProps = {
  identity: Identity;
  presence?: SpaceMember['presence'];
  onClick?: () => void;
};

export const IdentityListItem = forwardRef<
  HTMLLIElement,
  ThemedClassName<ComponentPropsWithoutRef<'li'>> & IdentityListItemProps
>(({ identity, presence, onClick, classNames, ...props }, forwardedRef) => {
  const fallbackValue = keyToFallback(identity.identityKey);
  const labelId = useId('identityListItem__label');
  const displayName = identity.profile?.displayName ?? generateName(identity.identityKey.toHex());
  return (
    <ListItem.Root
      {...props}
      classNames={mx('flex gap-2 pis-3 pie-1 items-center', onClick && 'cursor-pointer', classNames)}
      onClick={() => onClick?.()}
      data-testid='identity-list-item'
      labelId={labelId}
      ref={forwardedRef}
    >
      <Avatar.Root
        status={presence === SpaceMember.PresenceState.ONLINE ? 'active' : 'inactive'}
        labelId={labelId}
        hue={identity.profile?.data?.hue || fallbackValue.hue}
      >
        <Avatar.Frame classNames='place-self-center'>
          <Avatar.Fallback text={identity.profile?.data?.emoji || fallbackValue.emoji} />
        </Avatar.Frame>
        <Avatar.Label classNames='text-sm truncate pli-2'>{displayName}</Avatar.Label>
      </Avatar.Root>
    </ListItem.Root>
  );
});
