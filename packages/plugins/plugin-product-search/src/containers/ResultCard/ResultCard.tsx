//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { Card, IconButton, composable } from '@dxos/react-ui';

import { type Result } from '../../types/Result';

export type ResultCardProps = { subject: Result; current?: boolean };

/**
 * Presentational card for a search {@link Result}.
 *
 * Created with `composable()` so it carries the COMPOSABLE marker and can be the child of
 * `Focus.Item asChild` (a DXOS Slot that injects current/keyboard/click wiring + forwards ref).
 *
 * `Card.Header` is a 3-slot subgrid (icon · content · action); the star toggle occupies the
 * leading icon slot and title + price occupy the centre `1fr` content slot.
 */
export const ResultCard = composable<HTMLDivElement, ResultCardProps>(
  ({ subject, current, classNames, ...props }, forwardedRef) => {
    const imageUrl = subject.images?.[0];
    const price =
      subject.price != null ? [subject.currency, subject.price.toLocaleString()].filter(Boolean).join(' ') : undefined;
    const starred = Boolean(subject.starred);

    // Stop propagation so the star toggle doesn't trigger the tile's Focus.Item selection.
    const handleToggleStar = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        Obj.update(subject, (subject) => {
          subject.starred = !subject.starred;
        });
      },
      [subject],
    );

    return (
      <Card.Root
        ref={forwardedRef}
        fullWidth
        classNames={['dx-hover cursor-pointer', current && 'dx-current', classNames]}
        {...props}
      >
        {imageUrl && (
          <Card.Poster alt={subject.title ?? 'Product'} image={imageUrl} fit='cover' classNames='rounded-t-xs' />
        )}
        <Card.Header>
          <Card.IconBlock padding>
            <IconButton
              variant='ghost'
              iconOnly
              square
              size={4}
              label={starred ? 'Unstar' : 'Star'}
              icon={starred ? 'ph--star--fill' : 'ph--star--regular'}
              onClick={handleToggleStar}
            />
          </Card.IconBlock>
          <div className='flex flex-col gap-0.5 min-w-0 py-2'>
            <Card.Title classNames='line-clamp-2'>{subject.title}</Card.Title>
            {price && <span className='text-sm text-description'>{price}</span>}
          </div>
          <Card.IconBlock />
        </Card.Header>
      </Card.Root>
    );
  },
);
