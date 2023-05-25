//
// Copyright 2023 DXOS.org
//

import React, { ForwardedRef, forwardRef } from 'react';

import { mx } from '@dxos/aurora-theme';
import type { Space } from '@dxos/client';
import { Avatar, AvatarSlots } from '@dxos/react-appkit';
import { humanize } from '@dxos/util';

export const SpaceListItem = forwardRef(
  ({ space, onClick }: { space: Space; onClick?: () => void }, ref: ForwardedRef<HTMLLIElement>) => {
    return (
      <li
        className={mx('flex gap-2 items-center mbe-2', onClick && 'cursor-pointer')}
        onClick={() => onClick?.()}
        ref={ref}
        data-testid='space-list-item'
      >
        <Avatar
          {...{
            variant: 'circle',
            size: 9,
            fallbackValue: space.key.toHex(),
            label: <p className='text-sm truncate'>{space.properties.name ?? humanize(space.key)}</p>,
            slots: {
              labels: { className: 'block shrink overflow-hidden' },
              root: { classNames: 'shrink-0' },
            } satisfies AvatarSlots,
          }}
        />
      </li>
    );
  },
);
