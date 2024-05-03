//
// Copyright 2023 DXOS.org
//

import React, { type ForwardedRef, forwardRef } from 'react';

import type { Space } from '@dxos/react-client/echo';
import { Avatar, useId } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { humanize, keyToEmoji } from '@dxos/util';

export const SpaceListItem = forwardRef(
  ({ space, onClick }: { space: Space; onClick?: () => void }, ref: ForwardedRef<HTMLLIElement>) => {
    const fallbackValue = keyToEmoji(space.key);
    const labelId = useId('identityListItem__label');
    const displayName = space.properties.name ?? humanize(space.key.toHex());

    return (
      <li
        className={mx('flex gap-2 items-center mbe-2', onClick && 'cursor-pointer')}
        onClick={() => onClick?.()}
        ref={ref}
        data-testid='space-list-item'
      >
        <Avatar.Root labelId={labelId}>
          <Avatar.Frame>
            <Avatar.Fallback text={fallbackValue} />
          </Avatar.Frame>
          <Avatar.Label classNames='text-sm truncate'>{displayName}</Avatar.Label>
        </Avatar.Root>
      </li>
    );
  },
);
