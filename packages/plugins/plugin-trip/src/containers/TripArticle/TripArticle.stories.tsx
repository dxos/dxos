//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Space, useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { PLACES, TripBuilder } from '#testing';
import { Booking, Segment, Trip } from '#types';

import { TripPlugin } from '../../testing';
import { TripArticle } from './TripArticle';

const DefaultStory = () => {
  const spaces = useSpaces();
  const spaceId = spaces[0]?.id;
  const db = useDatabase(spaceId ?? '');
  const trips = useQuery(db, Filter.type(Trip.Trip));
  const trip = trips[0];

  if (!spaceId || !db || !trip) {
    return <Loading data={{ space: !!spaceId, db: !!db, trip: !!trip }} />;
  }

  return <TripArticle role='article' subject={trip} attendableId='story' />;
};

const baseDecorators = (seedFn: (space: Space) => void) => [
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
            seedFn(personalSpace);
            yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
          }),
      }),
      StorybookPlugin({}),
      TripPlugin(),
      PreviewPlugin(),
    ],
  })),
];

const meta = {
  title: 'plugins/plugin-trip/containers/TripArticle',
  render: DefaultStory,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: baseDecorators((space) => {
    // NYC → CDG, CDG → BHX, LTV → EUS, STP → Paris Nord (Eurostar), CDG → SIN, SIN → CDG, CDG → NYC.
    const { trip, segments, bookings } = new TripBuilder()
      .addFlight({
        from: PLACES.JFK,
        to: PLACES.CDG,
        daysFromNow: 0,
        durationHours: 7,
        airline: { name: 'Air France', code: 'AF' },
        flightNumber: 'AF 023',
        cabin: 'business',
        confirmed: true,
      })
      .addFlight({
        from: PLACES.CDG,
        to: PLACES.BHX,
        daysFromNow: 1,
        departHour: 13,
        durationHours: 1,
        airline: { name: 'Air France', code: 'AF' },
        flightNumber: 'AF 1268',
        cabin: 'economy',
        confirmed: true,
      })
      .addTrain({
        from: PLACES.LTV,
        to: PLACES.EUS,
        daysFromNow: 4,
        departHour: 9,
        durationHours: 1,
        operator: { name: 'Trainline' },
        trainNumber: 'TL 9F32',
      })
      .addTrain({
        from: PLACES.STP,
        to: PLACES.PAR_NORD,
        daysFromNow: 4,
        departHour: 11,
        durationHours: 3,
        operator: { name: 'Eurostar' },
        trainNumber: 'ES 9024',
      })
      .addFlight({
        from: PLACES.CDG,
        to: PLACES.SIN,
        daysFromNow: 5,
        departHour: 20,
        durationHours: 13,
        airline: { name: 'Singapore Airlines', code: 'SQ' },
        flightNumber: 'SQ 333',
        cabin: 'business',
        confirmed: true,
      })
      .addFlight({
        from: PLACES.SIN,
        to: PLACES.CDG,
        daysFromNow: 12,
        departHour: 23,
        durationHours: 13,
        airline: { name: 'Singapore Airlines', code: 'SQ' },
        flightNumber: 'SQ 334',
        cabin: 'business',
        confirmed: true,
      })
      .addFlight({
        from: PLACES.CDG,
        to: PLACES.JFK,
        daysFromNow: 14,
        departHour: 10,
        durationHours: 8,
        airline: { name: 'Air France', code: 'AF' },
        flightNumber: 'AF 006',
        cabin: 'business',
        confirmed: true,
      })
      .build('Paris · Singapore (via the UK)');
    bookings.forEach((booking: Booking.Booking) => space.db.add(booking));
    segments.forEach((segment: Segment.Segment) => space.db.add(segment));
    space.db.add(trip);
  }),
};

export const Empty: Story = {
  decorators: baseDecorators((space) => {
    space.db.add(Trip.make({ name: 'New Trip' }));
  }),
};
