//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Dnd } from '@dxos/react-ui-dnd';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { PLACES } from '#testing';
import { translations } from '#translations';
import { BookingSearch, Segment } from '#types';

import { OfferStack } from './OfferStack.tsx';

const OPERATORS: BookingSearch.FlightOffer['operator'][] = [
  { name: 'Duffel Airways', iataCode: 'ZZ' },
  { name: 'Iberia', iataCode: 'IB' },
  { name: 'British Airways', iataCode: 'BA' },
  { name: 'Air France', iataCode: 'AF' },
  { name: 'Singapore Airlines', iataCode: 'SQ' },
  { name: 'Koninklijke Luchtvaart Maatschappij (KLM Royal Dutch Airlines)', iataCode: 'KL' },
];

const SERVICE_CLASSES: Segment.ServiceClass[] = ['economy', 'premium', 'business', 'first'];

const AIRPORTS = [PLACES.JFK, PLACES.SFO, PLACES.LHR, PLACES.CDG, PLACES.BHX, PLACES.SIN];

const OFFER_COUNT = 40;

/** Deterministic offers (no randomness) so the stack is stable across loads while varying operator, route and price. */
const makeOffers = (count: number): BookingSearch.FlightOffer[] => {
  const baseTime = Date.parse('2026-07-15T06:00:00.000Z');
  return Array.from({ length: count }, (_, index): BookingSearch.FlightOffer => {
    const operator = OPERATORS[index % OPERATORS.length];
    const origin = AIRPORTS[index % AIRPORTS.length];
    const destination = AIRPORTS[(index * 5 + 1) % AIRPORTS.length];
    const departMs = baseTime + ((index * 7) % 48) * 60 * 60 * 1000;
    const durationHours = 2 + ((index * 3) % 14);
    // Every fifth offer omits times, matching providers that only return the route.
    const timed = index % 5 !== 4;
    return {
      _tag: 'flight',
      id: `off_${index + 1}`,
      provider: 'stub',
      operator,
      totalAmount: Math.round((420 + ((index * 137) % 2400) + index * 0.37) * 100) / 100,
      currency: index % 4 === 3 ? 'EUR' : 'USD',
      serviceClass: SERVICE_CLASSES[index % SERVICE_CLASSES.length],
      slices: [
        {
          origin: { code: origin.code ?? '', name: origin.city },
          destination: { code: destination.code ?? '', name: destination.city },
          number: `${operator.iataCode}${100 + index * 11}`,
          departAt: timed ? new Date(departMs).toISOString() : undefined,
          arriveAt: timed ? new Date(departMs + durationHours * 60 * 60 * 1000).toISOString() : undefined,
        },
      ],
    };
  });
};

const OFFERS = makeOffers(OFFER_COUNT);

const DefaultStory = () => (
  <Dnd.Root>
    <OfferStack
      offers={OFFERS}
      onSelect={(offer) => {
        // eslint-disable-next-line no-console
        console.log('select offer', offer.id);
      }}
    />
  </Dnd.Root>
);

const meta = {
  title: 'plugins/plugin-trip/components/OfferStack',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-(min-card-width)' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
