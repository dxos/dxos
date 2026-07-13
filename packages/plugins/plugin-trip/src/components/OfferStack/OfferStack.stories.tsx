//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Dnd } from '@dxos/react-ui-dnd';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { type BookingSearch as BookingSearchType } from '#types';

import { OfferStack } from './OfferStack';

const OFFERS: BookingSearchType.FlightOffer[] = [
  {
    _tag: 'flight',
    id: 'off_1',
    provider: 'stub',
    operator: { name: 'Duffel Airways', iataCode: 'ZZ' },
    totalAmount: 1373.56,
    currency: 'USD',
    serviceClass: 'business',
    slices: [
      {
        origin: { code: 'JFK', name: 'New York' },
        destination: { code: 'CDG', name: 'Paris' },
        number: 'ZZ100',
        departAt: '2026-07-15T08:00:00.000Z',
        arriveAt: '2026-07-15T20:00:00.000Z',
      },
    ],
  },
  {
    _tag: 'flight',
    id: 'off_2',
    provider: 'stub',
    operator: { name: 'Iberia', iataCode: 'IB' },
    totalAmount: 1375.42,
    currency: 'USD',
    serviceClass: 'business',
    slices: [
      { origin: { code: 'JFK', name: 'New York' }, destination: { code: 'CDG', name: 'Paris' }, number: 'IB200' },
    ],
  },
];

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
