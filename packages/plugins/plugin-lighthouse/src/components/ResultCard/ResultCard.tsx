//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent } from 'react';

import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import { Tag } from '@dxos/react-ui/Tag';
import * as Typography from '@dxos/react-ui/Typography';
import * as Util from '@dxos/react-ui/Util';

import { type CardModel } from '../../model/results.ts';
import { LighthouseNamespace } from '../../namespace.ts';
import { LocationPopover } from '../LocationPopover/LocationPopover.tsx';

/** Why a card's location row carries a note: outside the person's drawn areas, or no point to place it. */
export type AreaNote = 'outside' | 'no-location';

export type ResultCardProps = {
  card: CardModel;
  current?: boolean;
  starred?: boolean;
  /** The rating model's score, 0..1; absent before the agent writes a model. */
  score?: number;
  /** Requirements the result misses. */
  missed?: readonly string[];
  /**
   * `outside`: the result lies beyond every drawn area (and its soft edge), so the card is dimmed and says so;
   * `no-location`: it has no point. Without it, a card that names a place but has no point still says "no location".
   */
  areaNote?: AreaNote;
  onToggleStar?: () => void;
};

/** A click on an action inside the tile must not also select the tile. */
const stop = (handler?: () => void) => (event: MouseEvent) => {
  event.stopPropagation();
  handler?.();
};

/**
 * Masonry tile for a lighthouse result, in plugin-commerce's ResultCard shape: the first photo, the star in the
 * header's leading slot, title and price in its centre; then the key facts, the kind, and the score.
 * Composable so a masonry item (`Focus.Item asChild`) can make it the focusable, selectable unit.
 */
export const ResultCard = Util.composable<HTMLDivElement, ResultCardProps>(
  ({ card, current, starred = false, score, missed, areaNote, onToggleStar, classNames, ...props }, forwardedRef) => {
    const { t } = Hooks.useTranslation(LighthouseNamespace.key);
    const image = card.images[0];
    const note = areaNote ?? (card.unlocated ? 'no-location' : undefined);
    // The first location row carries the map popover, or the note.
    const locationRow = card.rows.findIndex((row) => row.location);

    return (
      <Card.Root
        ref={forwardedRef}
        classNames={[
          'dx-hover cursor-pointer',
          current && 'dx-current',
          areaNote === 'outside' && 'opacity-55 hover:opacity-90 transition-opacity',
          classNames,
        ]}
        data-testid='lighthouse.result'
        data-area-note={areaNote}
        {...props}
      >
        {!image && (
          // A card with no picture (a fund, a role) shows its type, so it does not read as empty.
          <Layout.Flex center classNames='h-16 rounded-t-xs bg-group-surface text-fg-subtle'>
            <Icon.Icon icon={card.icon} size='xl' />
          </Layout.Flex>
        )}
        {image && (
          <Card.Poster
            alt={card.title}
            src={image}
            fit={card.logo ? 'contain' : 'cover'}
            loading='lazy'
            // A logo is often dark on transparent: a light ground keeps it visible in either theme.
            classNames={['rounded-t-xs', card.logo && 'bg-white']}
          />
        )}
        <Card.Header>
          <Layout.Block>
            <SystemButton.Star variant='ghost' iconOnly pressed={starred} onClick={stop(onToggleStar)} />
          </Layout.Block>
          <Layout.Flex column gap='xs' classNames='min-w-0 py-2'>
            {card.eyebrow && (
              <Typography.Text classNames='text-xs font-semibold uppercase tracking-wide text-accent-text'>
                {card.eyebrow}
              </Typography.Text>
            )}
            <Card.Title lines={2}>{card.title}</Card.Title>
            {card.price && <span className='text-sm text-fg-muted tabular-nums'>{card.price}</span>}
          </Layout.Flex>
          <Layout.Block rail='end' />
        </Card.Header>
        {card.description && (
          <Card.Row>
            <Typography.Text lines={4} classNames='text-sm text-fg-muted whitespace-normal'>
              {card.description}
            </Typography.Text>
          </Card.Row>
        )}
        {card.rows.map((row, index) => {
          const text = (
            <Typography.Text truncate classNames='text-sm'>
              {row.text}
            </Typography.Text>
          );
          const first = index === locationRow;
          return (
            <Card.Row
              key={row.icon}
              icon={row.icon}
              title={row.title}
              trailing={
                first && note ? (
                  <span className='text-xs text-fg-subtle whitespace-nowrap' data-testid='lighthouse.card.geo-note'>
                    {t(note === 'outside' ? 'geo-outside.label' : 'geo-no-location.label')}
                  </span>
                ) : undefined
              }
            >
              {first && card.geo ? (
                <LocationPopover point={card.geo} address={card.geo.address}>
                  {text}
                </LocationPopover>
              ) : (
                text
              )}
            </Card.Row>
          );
        })}
        <Card.Row icon='ph--chart-bar--regular'>
          <Layout.Flex gap='xs' align='center' classNames='min-w-0'>
            {card.tags.map((tag) => (
              <Tag key={tag.label} hue={tag.hue ?? 'neutral'}>
                {tag.label}
              </Tag>
            ))}
            {score !== undefined && (
              <span
                className='text-sm text-fg-muted tabular-nums'
                title={missed?.length ? t('missed.label', { requirements: missed.join(', ') }) : undefined}
              >
                {Math.round(score * 100)}
              </span>
            )}
          </Layout.Flex>
        </Card.Row>
      </Card.Root>
    );
  },
);

ResultCard.displayName = 'ResultCard';
