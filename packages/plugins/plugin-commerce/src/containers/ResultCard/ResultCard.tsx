//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { useObject } from '@dxos/echo-react';
import { Flex, composable, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';

import { type Result } from '../../types/Result.ts';

export type ResultCardProps = {
  subject: Result;
  current?: boolean;
  /** Star state and toggle owned by the Search container (the immutable Result has no `starred`). */
  starred?: boolean;
  onToggleStar?: () => void;
};

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
  ({ subject, current, starred = false, onToggleStar, classNames, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);
    // Subscribe so the card re-renders when the result (or its image) loads.
    const [result] = useObject(subject);
    const imageUrl = result.images?.[0];
    const price =
      result.price != null ? [result.currency, result.price.toLocaleString()].filter(Boolean).join(' ') : undefined;

    // Stop propagation so the star toggle doesn't trigger the tile's Focus.Item selection.
    const handleToggleStar = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onToggleStar?.();
      },
      [onToggleStar],
    );

    return (
      <Next.Card.Root
        ref={forwardedRef}
        classNames={['dx-hover cursor-pointer', current && 'dx-current', classNames]}
        {...props}
      >
        {imageUrl && (
          <Next.Card.Poster
            alt={result.title ?? t('product.label')}
            image={imageUrl}
            fit='cover'
            classNames='rounded-t-xs'
          />
        )}
        <Next.Card.Header>
          <Next.Block>
            <Next.SystemButton.Star variant='ghost' iconOnly square active={starred} onClick={handleToggleStar} />
          </Next.Block>
          <Flex column gap='xs' classNames='min-w-0 py-2'>
            <Next.Card.Title lines={2}>{result.title}</Next.Card.Title>
            {price && <span className='text-sm text-description'>{price}</span>}
          </Flex>
          <Next.Block end />
        </Next.Card.Header>
      </Next.Card.Root>
    );
  },
);

ResultCard.displayName = 'ResultCard';
