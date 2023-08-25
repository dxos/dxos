//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Avatar, AvatarGroup, AvatarGroupItem, Tooltip, useJdenticonHref, useTranslation } from '@dxos/aurora';
import { useIdentity } from '@dxos/react-client/halo';

import { SPACE_PLUGIN } from '../types';

// TODO(burdon): Wire up to presence.
export const SpacePresence = () => {
  const identity = useIdentity();
  const fallbackHref = useJdenticonHref(identity?.identityKey.toHex() ?? '', 4);
  const { t } = useTranslation(SPACE_PLUGIN);
  return identity ? (
    <Tooltip.Root>
      <Tooltip.Trigger className='flex items-center'>
        <AvatarGroup.Root size={4} classNames='mie-5'>
          <AvatarGroup.Label classNames='text-xs font-system-semibold'>1</AvatarGroup.Label>
          <AvatarGroupItem.Root>
            <Avatar.Frame>
              <Avatar.Fallback href={fallbackHref} />
            </Avatar.Frame>
          </AvatarGroupItem.Root>
        </AvatarGroup.Root>
      </Tooltip.Trigger>
      <Tooltip.Content collisionPadding={4}>
        <span>{t('presence label')}</span>
        <Tooltip.Arrow />
      </Tooltip.Content>
    </Tooltip.Root>
  ) : null;
};
