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

import { TripBuilder } from '#testing';
import { Booking, Trip } from '#types';

import { TripPlugin } from '../../testing';

import { TripArticle } from './TripArticle';

const DefaultStory = () => {
  const spaces = useSpaces();
  const db = useDatabase(spaces[0].id);
  const trips = useQuery(db, Filter.type(Trip.Trip));
  const trip = trips[0];

  if (!db || !trip) {
    return <Loading data={{ db: !!db, trip: !!trip }} />;
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
        types: [Trip.Trip, Booking.Booking],
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
    const { trip, bookings } = new TripBuilder()
      .addFlight(0, { confirmed: true })
      .addHotel(1, 3)
      .addActivity(2)
      .addFlight(4)
      .build('London Trip');
    bookings.forEach((booking: Booking.Booking) => space.db.add(booking));
    space.db.add(trip);
  }),
};

export const Empty: Story = {
  decorators: baseDecorators((space) => {
    space.db.add(Trip.make({ name: 'New Trip' }));
  }),
};
