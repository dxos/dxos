//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Avatar, type AvatarStatus, type Size } from '@dxos/react-ui';
import { hexToFallback } from '@dxos/util';

export type UserAccountAvatarProps = {
  size?: Size;
  userId?: string;
  hue?: string;
  emoji?: string;
  status?: AvatarStatus;
};

export const UserAccountAvatar = (props: UserAccountAvatarProps) => {
  const fallbackValue = hexToFallback(props.userId ?? '0');

  return (
    <div className='grid place-items-center' data-joyride='welcome/account'>
      <Avatar.Root>
        <Avatar.Content
          variant='circle'
          size={props.size ?? 12}
          status={props.status ?? 'active'}
          hue={props.hue || fallbackValue.hue}
          fallback={props.emoji || fallbackValue.emoji}
          data-testid='treeView.userAccount'
        />
      </Avatar.Root>
    </div>
  );
};
