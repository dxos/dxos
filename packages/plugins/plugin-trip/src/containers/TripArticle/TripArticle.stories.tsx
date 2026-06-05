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
import { translations } from '#translations';
import { Booking, type Place, Routing, Segment, Trip, TripCapabilities } from '#types';

import { TripPlugin } from '../../testing';
import { SegmentArticle } from '../SegmentArticle/SegmentArticle';
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

/** Seeds a trip with a pre-planned road segment per consecutive city pair (deterministic fake router). */
const seedRoadTrip = (space: Space, name: string, cities: string[]): void => {
  const trip = Trip.make({ name });
  for (let index = 0; index < cities.length - 1; index++) {
    const { waypoints, routes } = fakeRoute([cities[index], cities[index + 1]]);
    const segment = Segment.make({
      details: { _tag: 'road', subKind: 'car', origin: waypoints[0], destination: waypoints[1], routes },
    });
    Trip.addSegment(trip, segment);
    space.db.add(segment);
  }
  space.db.add(trip);
};

//
// Live OSRM + Nominatim routing service hitting the public demo servers. Network-dependent and
// non-deterministic; used only by the `LiveRoute` story to exercise real geocoding + routing of
// arbitrary city names. The OSRM/Nominatim mapping is inlined here (mirrors @dxos/plugin-osrm)
// because plugin-trip cannot depend on plugin-osrm — which depends on plugin-trip.
//

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

type NominatimResult = { lat: string; lon: string };
type OsrmStep = { name?: string; ref?: string; geometry?: { coordinates?: Array<[number, number]> } };
type OsrmLeg = { distance?: number; duration?: number; summary?: string; steps?: OsrmStep[] };
type OsrmRoute = { distance?: number; duration?: number; legs?: OsrmLeg[] };
type OsrmResponse = { routes?: OsrmRoute[] };

const liveRoutingService: Routing.RoutingService = {
  id: 'osrm-live',
  label: 'OSRM (live)',
  profiles: ['driving'],
  route: async ({ waypoints }) => {
    const places: Place.Place[] = [];
    let geocodeCount = 0;
    for (const waypoint of waypoints) {
      if (typeof waypoint !== 'string') {
        places.push(waypoint);
        continue;
      }
      // Respect Nominatim's ≤ 1 req/s policy.
      if (geocodeCount++ > 0) {
        await delay(1_100);
      }
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(waypoint)}&format=jsonv2&limit=1`,
        { headers: { Accept: 'application/json' } },
      );
      if (!response.ok) {
        throw new Routing.GeocodeError(waypoint);
      }
      // External, untyped JSON — asserted to the documented Nominatim shape at this boundary.
      const [first] = (await response.json()) as NominatimResult[];
      if (!first) {
        throw new Routing.GeocodeError(waypoint);
      }
      places.push({ name: waypoint, geo: [Number(first.lon), Number(first.lat)] });
    }

    const path = places
      .map((place) => place.geo)
      .filter((geo): geo is NonNullable<typeof geo> => geo != null)
      .map(([lon, lat]) => `${lon},${lat}`)
      .join(';');
    if (path.split(';').length < 2) {
      throw new Routing.RouteError('All waypoints must resolve to coordinates to plan a route.');
    }

    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson&steps=true`,
    );
    if (!response.ok) {
      throw new Routing.RouteError(`OSRM request failed: ${response.status}`);
    }
    // External, untyped JSON — asserted to the documented OSRM shape at this boundary.
    const data = (await response.json()) as OsrmResponse;
    const routes: Routing.Route[] = (data.routes ?? []).map((route) => ({
      distance: route.distance ?? 0,
      duration: route.duration ?? 0,
      legs: (route.legs ?? []).map((leg) => ({
        distance: leg.distance ?? 0,
        duration: leg.duration ?? 0,
        summary: leg.summary || undefined,
        geometry: (leg.steps ?? []).flatMap((step) => step.geometry?.coordinates ?? []),
        steps: (leg.steps ?? []).map((step) => ({ name: step.name || undefined, ref: step.ref || undefined })),
      })),
    }));

    return { waypoints: places, routes };
  },
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
    <AttendableContainer id={ATTENDABLE_ID} classNames='dx-container grid grid-cols-2'>
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
  parameters: {
    layout: 'fullscreen',
    translations,
  },
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

// A single road segment whose origin/destination have ONLY the `city` property set (no name, code,
// or geo). Exercises the city-based geocoding path (`toWaypoint` → "City" query → RoutingService)
// and the segment form rendering city-only places. The London → Avignon pair has a captured route
// fixture, so planning yields a real road-following polyline (not a straight haversine fallback).
export const CityOnly: Story = {
  args: { showMap: true },
  decorators: baseDecorators((space) => {
    const trip = Trip.make({ name: 'London → Avignon (city only)' });
    const segment = Segment.make({
      details: {
        _tag: 'road',
        subKind: 'car',
        origin: { city: 'London' },
        destination: { city: 'Avignon' },
      },
    });
    Trip.addSegment(trip, segment);
    space.db.add(segment);
    space.db.add(trip);
  }),
};

// Single city-only road segment planned against the LIVE public OSRM + Nominatim demo servers
// (network, non-deterministic). Unlike the fake router's fixed table, this geocodes arbitrary city
// names (e.g. Birmingham) and returns real road geometry. May be slow or fail if the demo servers
// are down or rate-limit the request.
export const LiveRoute: Story = {
  args: { showMap: true },
  decorators: baseDecorators((space) => {
    const trip = Trip.make({ name: 'London → Birmingham (live)' });
    const segment = Segment.make({
      details: {
        _tag: 'road',
        subKind: 'car',
        origin: { city: 'London' },
        destination: { city: 'Birmingham' },
      },
    });
    Trip.addSegment(trip, segment);
    space.db.add(segment);
    space.db.add(trip);
  }, liveRoutingService),
};

export const Empty: Story = {
  decorators: baseDecorators((space) => {
    space.db.add(Trip.make({ name: 'New Trip' }));
  }),
};
