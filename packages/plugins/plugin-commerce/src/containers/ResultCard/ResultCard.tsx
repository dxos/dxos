//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { useObject } from '@dxos/echo-react';
import * as Block from '@dxos/react-ui/Block';
import * as Card from '@dxos/react-ui/Card';
import * as Flex from '@dxos/react-ui/Flex';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Util from '@dxos/react-ui/Util';

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
export const ResultCard = Util.composable<HTMLDivElement, ResultCardProps>(
  ({ subject, current, starred = false, onToggleStar, classNames, ...props }, forwardedRef) => {
    const { t } = Hooks.useTranslation(meta.profile.key);
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
      <Card.Root
        ref={forwardedRef}
        classNames={['dx-hover cursor-pointer', current && 'dx-current', classNames]}
        {...props}
      >
        {imageUrl && (
          <Card.Poster alt={result.title ?? t('product.label')} src={imageUrl} fit='cover' classNames='rounded-t-xs' />
        )}
        <Card.Header>
          <Block.Block>
            <SystemButton.Star variant='ghost' iconOnly pressed={starred} onClick={handleToggleStar} />
          </Block.Block>
          <Flex.Flex column gap='xs' classNames='min-w-0 py-2'>
            <Card.Title lines={2}>{result.title}</Card.Title>
            {price && <span className='text-sm text-fg-muted'>{price}</span>}
          </Flex.Flex>
          <Block.Block rail='end' />
        </Card.Header>
      </Card.Root>
    );
  },
);

ResultCard.displayName = 'ResultCard';
