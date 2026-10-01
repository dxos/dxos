//
// Copyright 2023 DXOS.org
//

import React, { type ForwardedRef, forwardRef } from 'react';

import type { Space } from '@dxos/react-client/echo';
import { useId } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { mx } from '@dxos/ui-theme';
import { humanize, keyToEmoji } from '@dxos/util';

export const SpaceListItem = forwardRef(
  ({ space, onClick }: { space: Space; onClick?: () => void }, ref: ForwardedRef<HTMLLIElement>) => {
    const fallbackValue = keyToEmoji(space.key);
    const labelId = useId('identityListItem__label');
    const displayName = space.properties.name ?? humanize(space.key.toHex());

    return (
      <li
        className={mx('flex gap-2 items-center mb-2', onClick && 'cursor-pointer')}
        onClick={() => onClick?.()}
        ref={ref}
        data-testid='space-list-item'
      >
        <Next.Avatar.Root labelId={labelId}>
          <Next.Avatar.Content fallback={fallbackValue} />
          <Next.Avatar.Label classNames='text-sm truncate'>{displayName}</Next.Avatar.Label>
        </Next.Avatar.Root>
      </li>
    );
  },
);
