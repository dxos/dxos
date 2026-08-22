//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Avatar, type AvatarStatus, type Size } from '@dxos/react-ui';
import { hexToFallback } from '@dxos/util';

import { L0ItemActiveTabIndicator } from '../Sidebar';

export type UserAccountAvatarProps = {
  size?: Size;
  userId?: string;
  hue?: string;
  emoji?: string;
  status?: AvatarStatus;
};

export const UserAccountAvatar = ({ size, userId, hue, emoji, status }: UserAccountAvatarProps) => {
  // The identity resolves only once the client has initialised. Seeding the deterministic fallback
  // with a placeholder id would render a stranger's colour and emoji until it lands, so an
  // identity-less avatar is a plain circle: present, but making no claim about who is signed in.
  const fallbackValue = userId ? hexToFallback(userId) : undefined;

  return (
    <>
      <L0ItemActiveTabIndicator classNames='inset-y-6' />
      <div
        className='grid place-items-center dx-focus-ring-group-indicator rounded-full'
        data-joyride='welcome/account'
      >
        <Avatar.Root>
          <Avatar.Content
            variant='circle'
            size={size ?? 12}
            // The status ring reads as presence, which an unresolved identity cannot claim.
            {...(fallbackValue && { status: status ?? 'active' })}
            hue={hue || fallbackValue?.hue}
            fallback={emoji || fallbackValue?.emoji || ''}
            // Distinct from the resolved avatar: `treeView.userAccount` is what the e2e harness
            // waits on to call the app booted.
            data-testid={fallbackValue ? 'treeView.userAccount' : 'treeView.userAccount.placeholder'}
          />
        </Avatar.Root>
      </div>
    </>
  );
};
