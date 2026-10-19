//
// Copyright 2023 DXOS.org
//

import React, { type ForwardedRef, forwardRef } from 'react';

import type { Space } from '@dxos/react-client/echo';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Hooks from '@dxos/react-ui/Hooks';
import { mx } from '@dxos/ui-theme';
import { humanize, keyToEmoji } from '@dxos/util';

export const SpaceListItem = forwardRef(
  ({ space, onClick }: { space: Space; onClick?: () => void }, ref: ForwardedRef<HTMLLIElement>) => {
    const fallbackValue = keyToEmoji(space.key);
    const labelId = Hooks.useId('identityListItem__label');
    const displayName = space.properties.name ?? humanize(space.key.toHex());

    return (
      <li
        className={mx('flex gap-2 items-center mb-2', onClick && 'cursor-pointer')}
        onClick={() => onClick?.()}
        ref={ref}
        data-testid='space-list-item'
      >
        <Avatar.Root aria-labelledby={labelId} fallback={fallbackValue} />
        <span id={labelId} className='text-sm truncate'>
          {displayName}
        </span>
      </li>
    );
  },
);
