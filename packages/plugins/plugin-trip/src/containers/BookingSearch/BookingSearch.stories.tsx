//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { Booking, type BookingSearch as BS, Segment, Trip, TripCapabilities } from '#types';

import { TripPlugin } from '../../testing';
import { BookingSearch } from './BookingSearch';

const STUB_OFFER: BS.FlightOffer = {
  _tag: 'flight' as const,
  id: 'off_stub',
  provider: 'stub',
  carrier: { name: 'Stub Air', iataCode: 'SA' },
  totalAmount: 199,
  currency: 'USD',
  cabinClass: 'economy' as const,
  slices: [{ origin: { code: 'JFK', name: 'New York' }, destination: { code: 'LHR', name: 'London' }, flightNumber: 'SA1' }],
};

const STUB_SERVICE: BS.BookingService = {
  id: 'stub',
  label: 'Stub Air',
  kinds: ['flight'],
  search: async () => [STUB_OFFER],
};

/** Inline plugin contributing the stub `BookingService` so the form (not the empty state) renders. */
const StubBookingPlugin = Plugin.define({
  id: 'org.dxos.plugin.trip.story.stub-booking',
  name: 'Stub Booking',
}).pipe(
  Plugin.addModule({
    id: 'stub-booking-service',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(TripCapabilities.BookingService, STUB_SERVICE)),
  }),
  Plugin.make,
);

const DefaultStory = () => {
  const spaces = useSpaces();
  const spaceId = spaces[0]?.id;
  const db = useDatabase(spaceId ?? '');
  const segments = useQuery(db, Filter.type(Segment.Segment));
  const segment = segments[0];

  if (!spaceId || !db || !segment) {
    return <Loading data={{ space: !!spaceId, db: !!db, segment: !!segment }} />;
  }

  return <BookingSearch segment={segment} />;
};

const meta = {
  title: 'plugins/plugin-trip/BookingSearch',
  render: DefaultStory,
  parameters: { layout: 'fullscreen' },
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager(() => ({
      setupEvents: [AppActivationEvents.SetupSettings],
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
