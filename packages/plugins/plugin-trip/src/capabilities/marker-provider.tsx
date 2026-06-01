//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useMemo } from 'react';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { MapCapabilities } from '@dxos/plugin-map/types';
import { useObject, useObjects } from '@dxos/react-client/echo';
import { type GeoMarker } from '@dxos/react-ui-geo';
import { isNonNullable } from '@dxos/util';

import { Place, Segment, Trip } from '#types';

import { AIRPORTS } from '../operations/extractor/const';

type LatLng = { lat: number; lng: number };

const toLatLng = (geo?: readonly [number, number, number?] | undefined): LatLng | undefined => {
  if (!geo || geo.length < 2) {
    return undefined;
  }
  const [lng, lat] = geo;
  return { lat, lng };
};

const sameLatLng = (a: LatLng, b: LatLng): boolean => a.lat === b.lat && a.lng === b.lng;

/** IATA code → coordinates, for geocoding places that carry a code but no explicit `geo`. */
const airportByIata = new Map<string, LatLng>(AIRPORTS.map(({ iata, geo }) => [iata, { lat: geo.lat, lng: geo.lng }]));

/**
 * Resolve a place to coordinates: prefer its explicit `geo`, otherwise (only when
 * `allowIataFallback`) geocode by its IATA `code` against {@link AIRPORTS}. The fallback is
 * airport-only, so it must not be used for rail/road station codes.
 */
const placeLatLng = (
  place: Place.Place | undefined,
  options: { allowIataFallback?: boolean } = {},
): LatLng | undefined => {
  const geo = toLatLng(place?.geo);
  if (geo) {
    return geo;
  }
  const code = place?.code?.toUpperCase();
  return options.allowIataFallback && code ? airportByIata.get(code) : undefined;
};

/** All points referenced by a segment (origin, destination), geocoded via `geo` or (flights only) IATA code. */
const segmentPoints = (seg: Segment.Segment): LatLng[] => {
  const points: LatLng[] = [];
  const allowIataFallback = seg.details._tag === 'flight';
  const origin = placeLatLng(Segment.getOrigin(seg), { allowIataFallback });
  const destination = placeLatLng(Segment.getDestination(seg), { allowIataFallback });
  if (origin) {
    points.push(origin);
  }
  if (destination && (!origin || !sameLatLng(destination, origin))) {
    points.push(destination);
  }
  return points;
};

/** Origin → destination line for transport segments (skip accommodation / activity). */
const segmentLine = (seg: Segment.Segment): MapCapabilities.GeoLine | undefined => {
  if (seg.details._tag === 'accommodation' || seg.details._tag === 'activity') {
    return undefined;
  }
  const allowIataFallback = seg.details._tag === 'flight';
  const source = placeLatLng(seg.details.origin, { allowIataFallback });
  const target = placeLatLng(seg.details.destination, { allowIataFallback });
  if (!source || !target || sameLatLng(source, target)) {
    return undefined;
  }
  return { source, target };
};

/** First geo-tagged point of a segment, if any. */
const segmentAnchor = (seg: Segment.Segment): LatLng | undefined => segmentPoints(seg)[0];

/**
 * Reactive markers for a {@link Trip.Trip}: one marker per segment (at its anchor point, keyed by
 * segment id so attention selection round-trips) plus origin→destination arcs for transport
 * segments. Selection is single-mode against the trip's attendable context.
 */
const useTripMarkers = (subject: Trip.Trip, { attendableId }: { attendableId?: string }): MapCapabilities.MarkerSet => {
  // Subscribe to the `segments` array and reactively load the ref targets (without this the refs
  // read empty on first mount and stale after edits — see TripArticle).
  const reactiveSubject = Obj.isObject(subject) ? subject : undefined;
  const [segmentRefs] = useObject(reactiveSubject, 'segments');
  const loaded = useObjects(segmentRefs ?? []);
  const segments = useMemo(() => Trip.getSegments(subject), [subject, segmentRefs?.length, loaded]);

  const markers = useMemo<GeoMarker[]>(
    () =>
      segments
        .map((seg): GeoMarker | undefined => {
          const point = segmentAnchor(seg);
          return point ? { id: seg.id, title: Segment.getTitle(seg), location: point } : undefined;
        })
        .filter(isNonNullable),
    [segments],
  );

  const lines = useMemo(() => segments.map(segmentLine).filter(isNonNullable), [segments]);

  const contextId = attendableId ?? Obj.getURI(subject);
  return { markers, lines, selection: { contextId, mode: 'single' } };
};

/** Provider plotting a {@link Trip.Trip}'s segments. */
export const tripMarkerProvider: MapCapabilities.MarkerProvider = {
  id: 'org.dxos.plugin.trip/segments',
  match: (subject) => Trip.instanceOf(subject),
  useMarkers: useTripMarkers,
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contributes(MapCapabilities.MarkerProvider, tripMarkerProvider)),
);
