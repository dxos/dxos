//
// Copyright 2026 DXOS.org
//

import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect } from 'react';

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter } from '@dxos/echo';
import { Keyboard } from '@dxos/keyboard';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { MapPlugin } from '@dxos/plugin-map/plugin';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Space, useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer, useSelected } from '@dxos/react-ui-attention';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { PLACES, TripBuilder, fakeRoute, fakeRoutingService } from '#testing';
import { Booking, type Routing, Segment, Trip, TripCapabilities } from '#types';

import { TripPlugin } from '../../testing';
import { SegmentArticle } from '../SegmentArticle/SegmentArticle';
import { liveRoutingService } from './live-routing';
import { TripArticle } from './TripArticle';

/** Inline plugin that contributes a `RoutingService` so `PlanRoute` resolves inside the story. */
const RoutingStoryPlugin = (service: Routing.RoutingService) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.trip.story.routing'), name: 'Story Routing' })).pipe(
    Plugin.addModule({
      id: 'story-routing',
      activatesOn: ActivationEvents.Startup,
      activate: () => Effect.succeed(Capability.contributes(TripCapabilities.RoutingService, service)),
    }),
    Plugin.make,
  )();

/** Seeds a trip pre-planned with road segments for the given cities (using the deterministic fake router). */
const seedRoadTrip = (space: Space, name: string, cities: string[]): void => {
  const trip = Trip.make({ name });
  const { legs } = fakeRoute(cities);
  for (const leg of legs) {
    const segment = Segment.make({
      details: {
        _tag: 'road',
        subKind: 'car',
        origin: leg.origin,
        destination: leg.destination,
        distanceMeters: leg.distanceMeters,
        durationSeconds: leg.durationSeconds,
        path: [...leg.path],
      },
    });
    Trip.addSegment(trip, segment);
    space.db.add(segment);
  }
  space.db.add(trip);
};

const ATTENDABLE_ID = 'story';

// Initialize the global keyboard system (normally done by plugin-navtree) so the
// article's 'j'/'k' bindings dispatch in isolation.
const withKeyboard: Decorator = (Story) => {
  useEffect(() => {
    Keyboard.singleton.initialize();
    return () => Keyboard.singleton.destroy();
  }, []);
  return <Story />;
};

const DefaultStory = ({ showMap }: { showMap?: boolean }) => {
  const spaces = useSpaces();
  const spaceId = spaces[0]?.id;
  const db = useDatabase(spaceId ?? '');
  const trips = useQuery(db, Filter.type(Trip.Trip));
  const trip = trips[0];
  // The segment shown in the companion column tracks the article's selection (defaults to the first).
  const selectedId = useSelected(ATTENDABLE_ID, 'single');

  if (!spaceId || !db || !trip) {
    return <Loading data={{ space: !!spaceId, db: !!db, trip: !!trip }} />;
  }

  const segments = Trip.getSegments(trip);
  const selected = segments.find((segment) => segment.id === selectedId) ?? segments[0];

  // AttendableContainer marks the subtree with `data-attendable-id` so focusing it establishes
  // attention for ATTENDABLE_ID. Two columns: the trip article, and the selected-segment companion.
  return (
    <AttendableContainer id={ATTENDABLE_ID} classNames='grid grid-cols-2 min-bs-0 overflow-hidden'>
      <TripArticle role='article' subject={trip} attendableId={ATTENDABLE_ID} defaultShowGlobe={showMap} />
      <div className='min-bs-0 overflow-hidden border-is border-separator'>
        {selected && (
          <SegmentArticle role='article' subject={selected} companionTo={trip} attendableId={ATTENDABLE_ID} />
        )}
      </div>
    </AttendableContainer>
  );
};

const baseDecorators = (
  seedFn: (space: Space) => void,
  routingService: Routing.RoutingService = fakeRoutingService(),
) => [
  withKeyboard,
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
      MapPlugin(),
      RoutingStoryPlugin(routingService),
      PreviewPlugin(),
    ],
  })),
];

// Renders the trip plotted on the generic plugin-map `map` surface (markers + route polyline).
const MapStory = () => {
  const spaces = useSpaces();
  const spaceId = spaces[0]?.id;
  const db = useDatabase(spaceId ?? '');
  const trips = useQuery(db, Filter.type(Trip.Trip));
  const trip = trips[0];

  if (!spaceId || !db || !trip) {
    return <Loading data={{ space: !!spaceId, db: !!db, trip: !!trip }} />;
  }

  return (
    <AttendableContainer id={ATTENDABLE_ID} classNames='contents'>
      <Surface.Surface role='map' data={{ subject: trip, attendableId: ATTENDABLE_ID }} limit={1} />
    </AttendableContainer>
  );
};

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

// A multi-city driving route (London → Avignon → Barcelona) pre-planned with the deterministic fake
// router. The Route section seeds its city list from these planned road segments; adding / removing
// a city re-plans via the contributed RoutingService and updates the map polyline.
export const RoadTrip: Story = {
  args: { showMap: true },
  decorators: baseDecorators((space) => {
    seedRoadTrip(space, 'London → Barcelona (via Avignon)', ['London', 'Avignon', 'Barcelona']);
  }),
};

// The same pre-planned road trip rendered on the plugin-map `map` surface: a marker per stop plus
// the route polyline between cities, resolved via plugin-trip's contributed MarkerProvider.
export const RoadTripMap: Story = {
  render: MapStory,
  decorators: baseDecorators((space) => {
    seedRoadTrip(space, 'London → Barcelona (via Avignon)', ['London', 'Avignon', 'Barcelona']);
  }),
};

// Same scenario, but backed by the real public OSRM + Nominatim services (live network). Excluded
// from the storybook test run (`!test`) so CI never depends on external services; open it via
// `storybook:serve` to see real driving geometry. The production provider is @dxos/plugin-osrm.
export const RoadTripLive: Story = {
  tags: ['!test'],
  decorators: baseDecorators((space) => {
    space.db.add(Trip.make({ name: 'London → Barcelona (live OSRM)' }));
  }, liveRoutingService()),
};

export const Empty: Story = {
  decorators: baseDecorators((space) => {
    space.db.add(Trip.make({ name: 'New Trip' }));
  }),
};
