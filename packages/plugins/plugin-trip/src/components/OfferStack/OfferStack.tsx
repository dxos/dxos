//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { Card, ScrollArea, type ThemedClassName, composable, composableProps, useTranslation } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';

import { meta } from '#meta';
import { type BookingSearch as BS } from '#types';

export type OfferSelectHandler = (offer: BS.FlightOffer) => void;

type OfferTileData = {
  offer: BS.FlightOffer;
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
  const { t } = useTranslation(meta.id);

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
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root fullWidth border={false} ref={forwardedRef}>
          <Card.Header>
            <Card.Icon icon='ph--airplane--regular' />
            <div className='flex items-baseline justify-between gap-2 min-w-0'>
              <Card.Title classNames='truncate'>{offer.carrier.name}</Card.Title>
              <Card.Text classNames='font-mono shrink-0'>
                {offer.totalAmount} {offer.currency}
              </Card.Text>
            </div>
          </Card.Header>
          <Card.Body>
            {(origin || destination) && (
              <Card.Row>
                <Card.Text variant='description'>
                  {origin} → {destination}
                </Card.Text>
              </Card.Row>
            )}
            {departAt && (
              <Card.Row icon='ph--calendar--regular'>
                <Card.Text variant='description'>{format(new Date(departAt), 'PPp')}</Card.Text>
              </Card.Row>
            )}
          </Card.Body>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

OfferTile.displayName = 'OfferTile';

export type OfferStackProps = ThemedClassName<{
  offers?: readonly BS.FlightOffer[];
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
      <Focus.Group asChild {...composableProps(props)} ref={forwardedRef}>
        <Mosaic.Container asChild withFocus currentId={currentId}>
          <ScrollArea.Root orientation='vertical' padding thin>
            <ScrollArea.Viewport>
              <Mosaic.Stack Tile={OfferTile} items={items} draggable={false} getId={(item) => item.offer.id} />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Focus.Group>
    );
  },
);

OfferStack.displayName = 'OfferStack';
