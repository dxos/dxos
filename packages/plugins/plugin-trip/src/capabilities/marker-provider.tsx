//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useMemo } from 'react';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { MapCapabilities } from '@dxos/plugin-map/types';
import { useObject, useObjects } from '@dxos/react-client/echo';
import { type GeoMarker, LatLngLiteral } from '@dxos/react-ui-geo';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';
import { Place, Routing, Segment, Trip } from '#types';

import { AIRPORTS } from '../operations/extractor/const';

// TODO(burdon): Factor out to @dxos/schema.

/**
 * Converts a `GeoPoint` ([lng, lat, height?]) to a Leaflet `LatLngLiteral`. Uses index access, not
 * destructuring: a GeoPoint read from a live ECHO object is a tuple proxy that is not iterable.
 */
export const toLatLng = (geo?: ArrayLike<number | undefined> | undefined): LatLngLiteral | undefined => {
  if (!geo || geo.length < 2) {
    return undefined;
  }

  const lng = geo[0];
  const lat = geo[1];
  if (lng == null || lat == null) {
    return undefined;
  }

  return { lng, lat };
};

const sameLatLng = (a: LatLngLiteral, b: LatLngLiteral): boolean => a.lat === b.lat && a.lng === b.lng;

/** IATA code → coordinates, for geocoding places that carry a code but no explicit `geo`. */
const airportByIata = new Map<string, LatLngLiteral>(
  AIRPORTS.map(({ iata, location: { lat, lng } }) => [iata, { lat, lng }]),
);

/**
 * Resolve a place to coordinates: prefer its explicit `geo`, otherwise (only when
 * `allowIataFallback`) geocode by its IATA `code` against {@link AIRPORTS}. The fallback is
 * airport-only, so it must not be used for rail/road station codes.
 */
const placeLatLng = (
  place: Place.Place | undefined,
  options: { allowIataFallback?: boolean } = {},
): LatLngLiteral | undefined => {
  const geo = toLatLng(place?.geo);
  if (geo) {
    return geo;
  }

  const code = place?.code?.toUpperCase();
  return options.allowIataFallback && code ? airportByIata.get(code) : undefined;
};

/** All points referenced by a segment (origin, destination), geocoded via `geo` or (flights only) IATA code. */
const segmentPoints = (seg: Segment.Segment): LatLngLiteral[] => {
  const points: LatLngLiteral[] = [];
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

/**
 * Map line(s) for a segment. A planner-routed road segment carries a decoded polyline (`path`),
 * rendered as a chain of connected straight segments that follows the road; other transport
 * segments fall back to a single origin→destination arc.
 */
/** Stroke color for plotted route legs. */
const ROUTE_COLOR = '#22c55e';

const segmentLines = (seg: Segment.Segment): MapCapabilities.GeoLine[] => {
  // Primary computed route geometry (derived from its legs), if planned.
  const route = seg.details._tag === 'road' ? seg.details.routes?.[0] : undefined;
  const geometry = route && Routing.routeGeometry(route);
  if (geometry && geometry.length >= 2) {
    const points = geometry.map((point) => toLatLng([point[0], point[1]])).filter(isNonNullable);
    const lines: MapCapabilities.GeoLine[] = [];
    for (let index = 0; index < points.length - 1; index++) {
      lines.push({ source: points[index], target: points[index + 1], color: ROUTE_COLOR });
    }
    return lines;
  }
  const line = segmentLine(seg);
  return line ? [{ ...line, color: ROUTE_COLOR }] : [];
};

/** First geo-tagged point of a segment, if any. */
const segmentAnchor = (seg: Segment.Segment): LatLngLiteral | undefined => segmentPoints(seg)[0];

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

  const markers = useMemo<GeoMarker[]>(() => {
    const result: GeoMarker[] = segments
      .map((seg): GeoMarker | undefined => {
        const point = segmentAnchor(seg);
        return point ? { id: seg.id, title: Segment.getTitle(seg), location: point } : undefined;
      })
      .filter(isNonNullable);

    // Each segment is anchored at its origin, so the final destination (which has no following
    // segment) would otherwise have no marker. Add it explicitly when it differs from its origin.
    const last = segments.at(-1);
    if (last) {
      const points = segmentPoints(last);
      const destination = points.length > 1 ? points[points.length - 1] : undefined;
      const origin = segmentAnchor(last);
      if (destination && (!origin || !sameLatLng(destination, origin))) {
        const place = Segment.getDestination(last);
        result.push({
          id: `${last.id}:destination`,
          title: place?.name ?? place?.city ?? place?.code ?? '',
          location: destination,
        });
      }
    }

    return result;
  }, [segments]);

  const lines = useMemo(() => segments.flatMap(segmentLines), [segments]);

  const contextId = attendableId ?? Obj.getURI(subject);
  return { markers, lines, selection: { contextId, mode: 'single' } };
};

/** Provider plotting a {@link Trip.Trip}'s segments. */
export const tripMarkerProvider: MapCapabilities.MarkerProvider = {
  id: `${meta.id}/segments`,
  match: (subject) => Trip.instanceOf(subject),
  useMarkers: useTripMarkers,
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contributes(MapCapabilities.MarkerProvider, tripMarkerProvider)),
);
