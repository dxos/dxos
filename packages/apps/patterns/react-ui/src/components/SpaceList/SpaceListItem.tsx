//
// Copyright 2023 DXOS.org
//

import React, { ForwardedRef, forwardRef } from 'react';

import type { Space } from '@dxos/client';
import { Avatar, mx } from '@dxos/react-components';
import { humanize } from '@dxos/util';

export const SpaceListItem = forwardRef(
  ({ space, onClick }: { space: Space; onClick?: () => void }, ref: ForwardedRef<HTMLLIElement>) => {
    return (
      <li
        className={mx('flex gap-2 items-center', onClick && 'cursor-pointer')}
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
            slots: { labels: { className: 'block shrink overflow-hidden' }, root: { className: 'shrink-0' } }
          }}
        />
      </li>
    );
  }
);
