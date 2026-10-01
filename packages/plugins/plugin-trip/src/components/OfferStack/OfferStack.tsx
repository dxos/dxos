//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { Next, type ThemedClassName, composable, composableProps, useTranslation } from '@dxos/react-ui';
import { Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';

import { meta } from '#meta';
import { BookingSearch } from '#types';

export type OfferSelectHandler = (offer: BookingSearch.FlightOffer) => void;

type OfferTileData = {
  offer: BookingSearch.FlightOffer;
  onSelect?: OfferSelectHandler;
};

type OfferTileProps = Pick<MosaicTileProps<OfferTileData>, 'data' | 'location' | 'current'>;

/**
 * Mosaic tile for a flight `BookingSearch.FlightOffer`. Mirrors `SegmentTile`'s
 * Card composition (header + body rows) and selection wiring, so the offers list
 * shares the stack's `dx-current` / focus behaviour. Activating a tile applies the
 * offer via `onSelect`.
 */
const OfferTile = forwardRef<HTMLDivElement, OfferTileProps>(({ data, location, current }, forwardedRef) => {
  const { offer, onSelect } = data;
  const { setCurrentId } = useMosaicContainer('OfferTile');
  const { t } = useTranslation(meta.profile.key);

  const handleCurrentChange = useCallback(() => {
    setCurrentId(offer.id);
    onSelect?.(offer);
  }, [offer, onSelect, setCurrentId]);

  const origin = offer.slices.at(0)?.origin.code;
  const destination = offer.slices.at(-1)?.destination.code;
  const departAt = offer.slices.at(0)?.departAt;

  return (
    <Mosaic.Tile
      asChild
      classNames='dx-hover dx-current border-b border-subdued-separator'
      id={offer.id}
      data={data}
      location={location}
    >
      <Next.Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Next.Card.Root border={false} ref={forwardedRef}>
          <Next.Card.Header>
            <Next.Block>
              <Next.Icon icon='ph--airplane--regular' />
            </Next.Block>
            <div className='flex items-baseline justify-between gap-2 min-w-0'>
              <Next.Card.Title truncate>{offer.operator.name}</Next.Card.Title>
              <Next.Card.Text classNames='font-mono shrink-0'>
                {offer.totalAmount} {offer.currency}
              </Next.Card.Text>
            </div>
          </Next.Card.Header>
          <Next.Card.Body>
            {(origin || destination) && (
              <Next.Card.Row>
                <Next.Card.Text variant='description'>
                  {origin} → {destination}
                </Next.Card.Text>
              </Next.Card.Row>
            )}
            {departAt && (
              <Next.Card.Row>
                <Next.Block>
                  <Next.Icon icon='ph--calendar--regular' />
                </Next.Block>
                <Next.Card.Text variant='description'>{format(new Date(departAt), 'PPp')}</Next.Card.Text>
              </Next.Card.Row>
            )}
          </Next.Card.Body>
        </Next.Card.Root>
      </Next.Focus.Item>
    </Mosaic.Tile>
  );
});

OfferTile.displayName = 'OfferTile';

export type OfferStackProps = ThemedClassName<{
  offers?: readonly BookingSearch.FlightOffer[];
  currentId?: string;
  onSelect?: OfferSelectHandler;
}>;

/**
 * Scrollable mosaic stack of flight offers. Reuses the `Mosaic.Container` +
 * `Mosaic.Stack` list pattern (as `SegmentStack`) so offers render with the same
 * card / focus / scroll affordances. Tiles are not draggable.
 */
export const OfferStack = composable<HTMLDivElement, OfferStackProps>(
  ({ offers = [], currentId, onSelect, ...props }, forwardedRef) => {
    const items = useMemo(() => offers.map((offer) => ({ offer, onSelect })), [offers, onSelect]);

    return (
      <Next.Focus.Group asChild {...composableProps(props)} ref={forwardedRef}>
        <Mosaic.Container asChild withFocus currentId={currentId}>
          <Next.ScrollArea.Root orientation='vertical'>
            <Next.ScrollArea.Viewport>
              <Mosaic.Stack Tile={OfferTile} items={items} draggable={false} getId={(item) => item.offer.id} />
            </Next.ScrollArea.Viewport>
          </Next.ScrollArea.Root>
        </Mosaic.Container>
      </Next.Focus.Group>
    );
  },
);

OfferStack.displayName = 'OfferStack';
