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
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { TripBuilder } from '#testing';
import { Booking, Segment, Trip } from '#types';

import { TripPlugin } from '../../testing';
import { SegmentArticle } from './SegmentArticle';

type StoryArgs = {
  /** Index of the segment to view (0-based; -1 for none). */
  selectedIndex?: number;
};

// SegmentArticle defaults booking-less segments to its BookingSearch view, which resolves
// capabilities — so the story needs a PluginManager (not just a client provider).
const seed = (space: Space) => {
  const { trip, segments, bookings } = new TripBuilder()
    .addFlight(0, { confirmed: true })
    .addHotel(1, 3)
    .addActivity(2)
    .addFlight(4)
    .build('London Trip');
  bookings.forEach((booking) => space.db.add(booking));
  segments.forEach((segment) => space.db.add(segment));
  space.db.add(trip);
};

const DefaultStory = ({ selectedIndex = 0 }: StoryArgs) => {
  const [space] = useSpaces();
  const trip = useQuery(space?.db, Filter.type(Trip.Trip))[0];

  if (!space?.db || !trip) {
    return <Loading data={{ space: !!space, db: !!space?.db, trip: !!trip }} />;
  }

  const segment = Trip.getSegments(trip)[selectedIndex];
  if (!segment) {
    return <div className='p-4 text-description'>Select a segment to view details.</div>;
  }

  return <SegmentArticle role='article' subject={segment} companionTo={trip} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-trip/containers/SegmentArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager(() => ({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Trip.Trip, Segment.Segment, Booking.Booking],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              seed(personalSpace);
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        StorybookPlugin({}),
        TripPlugin(),
        PreviewPlugin(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Flight: Story = {
  args: {
    selectedIndex: 0,
  },
};

export const Accommodation: Story = {
  args: {
    selectedIndex: 1,
  },
};

export const Activity: Story = {
  args: {
    selectedIndex: 2,
  },
};

export const Tentative: Story = {
  args: {
    selectedIndex: 3,
  },
};

export const Empty: Story = {
  args: { selectedIndex: -1 },
};
