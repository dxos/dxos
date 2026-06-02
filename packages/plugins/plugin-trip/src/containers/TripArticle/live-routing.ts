//
// Copyright 2026 DXOS.org
//

import { type Place, Routing } from '#types';

//
// Story-only live RoutingService that calls the public Nominatim + OSRM demo servers directly.
// It mirrors @dxos/plugin-osrm (the production provider), inlined here to avoid a plugin-trip →
// plugin-osrm dependency. Used only by the `RoadTripLive` story (excluded from the storybook test).
//

type NominatimHit = { lat: string; lon: string };
type OsrmStep = { geometry?: { coordinates?: Array<[number, number]> } };
type OsrmLeg = { distance?: number; duration?: number; steps?: OsrmStep[] };
type OsrmResponse = { code?: string; routes?: Array<{ distance?: number; duration?: number; legs?: OsrmLeg[] }> };

export const liveRoutingService = (): Routing.RoutingService => ({
  id: 'osrm-live',
  label: 'OSRM (live)',
  profiles: ['driving'],
  route: async ({ waypoints }) => {
    const places: Place.Place[] = [];
    for (const waypoint of waypoints) {
      if (typeof waypoint !== 'string') {
        places.push(waypoint);
        continue;
      }
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(waypoint)}&format=jsonv2&limit=1`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      // External, untyped JSON asserted to the documented Nominatim shape at this boundary.
      const results = (await response.json()) as NominatimHit[];
      const hit = results[0];
      if (!hit) {
        throw new Routing.GeocodeError(waypoint);
      }
      places.push({ name: waypoint, city: waypoint, geo: [Number(hit.lon), Number(hit.lat)] });
    }

    const coordinates = places
      .map((place) => place.geo)
      .filter((geo): geo is NonNullable<typeof geo> => geo != null)
      .map((geo) => `${geo[0]},${geo[1]}`)
      .join(';');
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(routeUrl);
    // External, untyped JSON asserted to the documented OSRM shape at this boundary.
    const json = (await response.json()) as OsrmResponse;
    const route = json.routes?.[0];
    if (json.code !== 'Ok' || !route) {
      throw new Routing.RouteError(`OSRM routing failed: ${json.code ?? 'unknown'}`);
    }

    const osrmLegs = route.legs ?? [];
    const legs: Routing.RouteLeg[] = [];
    for (let index = 0; index < osrmLegs.length; index++) {
      const origin = places[index];
      const destination = places[index + 1];
      if (!origin || !destination) {
        continue;
      }
      const osrmLeg = osrmLegs[index];
      const path = (osrmLeg.steps ?? []).flatMap((step) => step.geometry?.coordinates ?? []);
      legs.push({
        origin,
        destination,
        distanceMeters: osrmLeg.distance ?? 0,
        durationSeconds: osrmLeg.duration ?? 0,
        path,
      });
    }

    return { legs, distanceMeters: route.distance ?? 0, durationSeconds: route.duration ?? 0 };
  },
});
