//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { generateName } from '@dxos/display-name';
import { requirePublicKey } from '@dxos/protocols/buf';
import { type SpaceMember, SpaceMember_PresenceState } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { Listbox } from '@dxos/react-ui-list';
import * as Avatar from '@dxos/react-ui/Avatar';
import type * as Util from '@dxos/react-ui/Util';
import { keyToFallback } from '@dxos/util';

import { profileString } from '../../util/index.ts';

type IdentityListItemProps = {
  identity: Pick<Identity, 'identityKey' | 'profile'>;
  presence?: SpaceMember['presence'];
};

/** The identity's display name, else a name derived from its key. */
export const identityDisplayName = (identity: Pick<Identity, 'identityKey' | 'profile'>): string =>
  identity.profile?.displayName ?? generateName(requirePublicKey(identity.identityKey).toHex());

/** One identity as a Listbox row: its avatar (ringed by presence) in the leading cell, then its name. */
export const IdentityListItem = forwardRef<
  HTMLDivElement,
  Util.ThemedClassName<ComponentPropsWithoutRef<'div'>> & IdentityListItemProps
>(({ identity, presence, ...props }, forwardedRef) => {
  const identityKey = requirePublicKey(identity.identityKey);
  const fallbackValue = keyToFallback(identityKey);
  return (
    <Listbox.Item {...props} id={identityKey.toHex()} data-testid='identity-list-item' ref={forwardedRef}>
      <Listbox.ItemIcon>
        <Avatar.Root
          status={presence === SpaceMember_PresenceState.ONLINE ? 'active' : 'inactive'}
          hue={Avatar.toAvatarHue(profileString(identity, 'hue') ?? fallbackValue.hue)}
          fallback={profileString(identity, 'emoji') ?? fallbackValue.emoji}
        />
      </Listbox.ItemIcon>
      <Listbox.ItemText />
    </Listbox.Item>
  );
});
