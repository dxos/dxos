//
// Copyright 2023 DXOS.org
//

import React, { type ComponentProps } from 'react';

import * as Avatar from '@dxos/react-ui/Avatar';
import { hexToFallback } from '@dxos/util';

import { L0ItemActiveTabIndicator } from '../Sidebar/index.ts';

export type UserAccountAvatarProps = {
  size?: ComponentProps<typeof Avatar.Root>['size'];
  userId?: string;
  hue?: string;
  emoji?: string;
  status?: Avatar.Status;
  /** Shows a dot on the avatar, e.g. while invitations are pending. */
  badge?: boolean;
};

export const UserAccountAvatar = ({ size, userId, hue, emoji, status, badge }: UserAccountAvatarProps) => {
  const fallbackValue = userId ? hexToFallback(userId) : undefined;
  const resolved = fallbackValue !== undefined;

  return (
    <>
      <L0ItemActiveTabIndicator classNames='inset-y-6' />
      <div
        className='grid place-items-center dx-focus-ring-group-indicator rounded-full'
        data-joyride='welcome/account'
      >
        {/* Sized by the avatar so the badge sits on its corner, not the cell's. */}
        <span className='relative inline-grid'>
          <Avatar.Root
            variant='circle'
            size={size ?? 'xl'}
            {...(resolved && { status: status ?? 'active' })}
            hue={Avatar.toAvatarHue(hue || fallbackValue?.hue)}
            fallback={emoji || fallbackValue?.emoji || ''}
            data-testid={resolved ? 'treeView.userAccount' : 'treeView.userAccount.pending'}
          />
          {badge && (
            <span
              className='absolute top-0 right-0 size-2.5 rounded-full bg-error-text'
              data-testid='treeView.userAccount.badge'
            />
          )}
        </span>
      </div>
    </>
  );
};
