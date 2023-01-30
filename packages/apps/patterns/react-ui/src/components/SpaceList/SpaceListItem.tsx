//
// Copyright 2023 DXOS.org
//

import React, { ForwardedRef, forwardRef } from 'react';

import type { Space } from '@dxos/client';
import { Avatar, mx } from '@dxos/react-components';
import { humanize } from '@dxos/util';

export const SpaceListItem = forwardRef(
  ({ space, onSelect }: { space: Space; onSelect?: () => void }, ref: ForwardedRef<HTMLLIElement>) => {
    return (
      <li
        className={mx('flex gap-2 items-center', onSelect && 'cursor-pointer')}
        onClick={() => onSelect?.()}
        ref={ref}
        data-testid='space-list-item'
      >
        <Avatar
          {...{
            variant: 'circle',
            size: 9,
            fallbackValue: space.key.toHex(),
            label: <p className='text-sm truncate'>{space.getProperty('title') ?? humanize(space.key)}</p>,
            slots: { labels: { className: 'block shrink overflow-hidden' }, root: { className: 'shrink-0' } }
          }}
        />
      </li>
    );
  }
);
