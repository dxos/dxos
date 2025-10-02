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
  const fallbackValue = hexToFallback(userId ?? '0');

  return (
    <>
      <L0ItemActiveTabIndicator classNames='inset-block-6' />
      <div
        className='grid place-items-center dx-focus-ring-group-indicator rounded-full'
        data-joyride='welcome/account'
      >
        <Avatar.Root>
          <Avatar.Content
            variant='circle'
            size={size ?? 12}
            status={status ?? 'active'}
            hue={hue || fallbackValue.hue}
            fallback={emoji || fallbackValue.emoji}
            data-testid='treeView.userAccount'
          />
        </Avatar.Root>
      </div>
    </>
  );
};
