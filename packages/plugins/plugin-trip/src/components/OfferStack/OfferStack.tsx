//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import * as Block from '@dxos/react-ui/Block';
import * as Card from '@dxos/react-ui/Card';
import * as Focus from '@dxos/react-ui/Focus';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Util from '@dxos/react-ui/Util';

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
  const { t } = Hooks.useTranslation(meta.profile.key);

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
      classNames='dx-hover dx-current border-b border-separator-subtle'
      id={offer.id}
      data={data}
      location={location}
    >
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root border={false} ref={forwardedRef}>
          <Card.Header>
            <Block.Block>
              <Icon.Icon icon='ph--airplane--regular' />
            </Block.Block>
            <div className='flex items-baseline justify-between gap-2 min-w-0'>
              <Card.Title truncate>{offer.operator.name}</Card.Title>
              <Card.Text classNames='font-mono shrink-0'>
                {offer.totalAmount} {offer.currency}
              </Card.Text>
            </div>
          </Card.Header>
          <Card.Body>
            {(origin || destination) && (
              <Card.Row>
                <Card.Text variant='muted'>
                  {origin} → {destination}
                </Card.Text>
              </Card.Row>
            )}
            {departAt && (
              <Card.Row>
                <Block.Block>
                  <Icon.Icon icon='ph--calendar--regular' />
                </Block.Block>
                <Card.Text variant='muted'>{format(new Date(departAt), 'PPp')}</Card.Text>
              </Card.Row>
            )}
          </Card.Body>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

OfferTile.displayName = 'OfferTile';

export type OfferStackProps = Util.ThemedClassName<{
  offers?: readonly BookingSearch.FlightOffer[];
  currentId?: string;
  onSelect?: OfferSelectHandler;
}>;

/**
 * Scrollable mosaic stack of flight offers. Reuses the `Mosaic.Container` +
 * `Mosaic.Stack` list pattern (as `SegmentStack`) so offers render with the same
 * card / focus / scroll affordances. Tiles are not draggable.
 */
export const OfferStack = Util.composable<HTMLDivElement, OfferStackProps>(
  ({ offers = [], currentId, onSelect, ...props }, forwardedRef) => {
    const items = useMemo(() => offers.map((offer) => ({ offer, onSelect })), [offers, onSelect]);

    return (
      <Focus.Group asChild {...Util.composableProps(props)} ref={forwardedRef}>
        <Mosaic.Container asChild withFocus currentId={currentId}>
          <ScrollArea.Root orientation='vertical'>
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
