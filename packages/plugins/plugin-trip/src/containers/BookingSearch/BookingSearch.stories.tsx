//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { Booking, type BookingSearch as BookingSearchType, Segment, Trip, TripCapabilities } from '#types';

import { TripPlugin } from '../../testing';
import { BookingSearch } from './BookingSearch';

const STUB_OFFER: BookingSearchType.FlightOffer = {
  _tag: 'flight' as const,
  id: 'off_stub',
  provider: 'stub',
  operator: { name: 'Stub Air', iataCode: 'SA' },
  totalAmount: 199,
  currency: 'USD',
  serviceClass: 'economy' as const,
  slices: [{ origin: { code: 'JFK', name: 'New York' }, destination: { code: 'LHR', name: 'London' }, number: 'SA1' }],
};

const STUB_SERVICE: BookingSearchType.BookingService = {
  id: 'stub',
  label: 'Stub Air',
  kinds: ['flight'],
  search: async () => [STUB_OFFER],
};

/** Inline plugin contributing the stub `BookingService` so the form (not the empty state) renders. */
const StubBookingPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.trip.story.stubBooking'),
    name: 'Stub Booking',
  }),
).pipe(
  Plugin.addModule({
    id: 'stub-booking-service',
    provides: [TripCapabilities.BookingService],
    activate: () => Effect.succeed([Capability.contribute(TripCapabilities.BookingService, STUB_SERVICE)]),
  }),
  Plugin.make,
);

const DefaultStory = () => {
  const [space] = useSpaces();
  const segments = useQuery(space?.db, Filter.type(Segment.Segment));
  const segment = segments[0];

  if (!space?.db || !segment) {
    return <Loading data={{ space: !!space, db: !!space?.db, segment: !!segment }} />;
  }

  return <BookingSearch segment={segment} />;
};

const meta = {
  title: 'plugins/plugin-trip/containers/BookingSearch',
  render: DefaultStory,
  parameters: { layout: 'fullscreen' },
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager(() => ({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Trip.Trip, Segment.Segment, Booking.Booking],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              personalSpace.db.add(Segment.makeDefault('flight'));
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        StorybookPlugin({}),
        TripPlugin(),
        StubBookingPlugin(),
      ],
    })),
  ],
} satisfies Meta<typeof DefaultStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
