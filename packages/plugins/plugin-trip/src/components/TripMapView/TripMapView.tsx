//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { composable, composableProps, useThemeContext } from '@dxos/react-ui';
import {
  type ControlAction,
  type GeoMarker,
  Globe,
  type GlobeController,
  Map as GeoMap,
  type MapController,
  globeStyles,
  useDrag,
  useGlobeZoomHandler,
  useMapZoomHandler,
  useTour,
  useWheel,
} from '@dxos/react-ui-geo';
import { loadTopology } from '@dxos/react-ui-geo/data';

import { Place, Segment } from '#types';

import { AIRPORTS } from '../../operations/extractor/const';

/** Map presentation variant: 3D `Globe` or 2D leaflet `Map`. */
export type TripMapVariant = 'globe' | 'map';

const initialRotation: [number, number, number] = [0, -20, 0];
const initialZoom = 1.2;

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
 * Resolve a place to coordinates: prefer its explicit `geo`, otherwise geocode by its
 * IATA `code` against {@link AIRPORTS}. Returns undefined when neither is available.
 */
const placeLatLng = (place?: Place.Place): LatLng | undefined => {
  const geo = toLatLng(place?.geo);
  if (geo) {
    return geo;
  }
  const code = place?.code?.toUpperCase();
  return code ? airportByIata.get(code) : undefined;
};

/** All points referenced by a segment (origin, destination), geocoded via `geo` or IATA code. */
const segmentPoints = (seg: Segment.Segment): LatLng[] => {
  const points: LatLng[] = [];
  const origin = placeLatLng(Segment.getOrigin(seg));
  const destination = placeLatLng(Segment.getDestination(seg));
  if (origin) {
    points.push(origin);
  }
  // Single-location variants (accommodation/activity) get the same place from getOrigin/getDestination —
  // skip the dup.
  if (destination && (!origin || !sameLatLng(destination, origin))) {
    points.push(destination);
  }
  return points;
};

/** Origin → destination line for transport segments (skip accommodation / activity). */
const segmentLine = (seg: Segment.Segment): { source: LatLng; target: LatLng } | undefined => {
  if (seg.details._tag === 'accommodation' || seg.details._tag === 'activity') {
    return undefined;
  }
  const source = placeLatLng(seg.details.origin);
  const target = placeLatLng(seg.details.destination);
  if (!source || !target || sameLatLng(source, target)) {
    return undefined;
  }
  return { source, target };
};

/** Great-circle squared-distance heuristic for nearest-point search. */
const distanceSq = (a: LatLng, b: LatLng): number => {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
};

/** First geo-tagged point of a segment, if any. */
const segmentAnchor = (seg: Segment.Segment): LatLng | undefined => segmentPoints(seg)[0];

export type TripMapViewProps = {
  segments: Segment.Segment[];
  selectedSegmentId?: string;
  variant?: TripMapVariant;
  onSelect?: (segmentId: string) => void;
  onVariantToggle?: () => void;
};

/**
 * Presentational map for a Trip. Plots each segment's geo-tagged origin,
 * destination, and venue; transport segments add origin→destination arcs (globe)
 * or markers (map).
 *
 * Two variants share the same geocoding and selection behaviour:
 * - `globe` — 3D orthographic globe with great-circle arcs and a fly-to tour.
 * - `map` — 2D leaflet map with markers, auto-fit to bounds.
 *
 * The geo `Action` control's toggle button switches variant (via
 * `onVariantToggle`); on the globe the path button plays/pauses the tour.
 * Selecting a segment recenters the active view; clicking the globe selects the
 * nearest segment.
 *
 * Composable: the root <div> forwards refs and merges incoming
 * `className`/`classNames` so it can be used in `asChild` slots.
 */
export const TripMapView = composable<HTMLDivElement, TripMapViewProps>(
  ({ segments, selectedSegmentId, variant = 'globe', onSelect, onVariantToggle, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const [topology, setTopology] = useState<Awaited<ReturnType<typeof loadTopology>>>();
    const [controller, setController] = useState<GlobeController | null>();
    const [mapController, setMapController] = useState<MapController | null>();
    const styles = useMemo(() => globeStyles(themeMode), [themeMode]);

    useEffect(() => {
      void loadTopology().then(setTopology);
    }, []);

    const handleGlobeZoom = useGlobeZoomHandler(controller);
    const handleMapZoom = useMapZoomHandler(mapController);
    useWheel(controller);
    useDrag(controller);

    // Build the globe geo features (points + great-circle lines).
    const features = useMemo(() => {
      const points: LatLng[] = [];
      const lines: { source: LatLng; target: LatLng }[] = [];
      for (const seg of segments) {
        for (const point of segmentPoints(seg)) {
          if (!points.some((existing) => sameLatLng(existing, point))) {
            points.push(point);
          }
        }
        const line = segmentLine(seg);
        if (line) {
          lines.push(line);
        }
      }
      return { points, lines };
    }, [segments]);

    // Map markers — one per geo-tagged point, titled by segment.
    const markers = useMemo<GeoMarker[]>(() => {
      const result: GeoMarker[] = [];
      for (const seg of segments) {
        segmentPoints(seg).forEach((point, index) => {
          result.push({ id: `${seg.id}:${index}`, title: Segment.getTitle(seg), location: point });
        });
      }
      return result;
    }, [segments]);

    // Tour through itinerary points.
    // Dedupe only *consecutive* duplicates so hub revisits are preserved — e.g.
    // a trip with legs CDG→BHX, EUS→CDG, CDG→SIN should fly the camera CDG → BHX
    // → LTV → EUS → CDG → SIN, not skip the second CDG just because it appeared
    // earlier in the itinerary.
    const tourPoints = useMemo(() => {
      const points = segments.flatMap((seg) => segmentPoints(seg));
      return points.filter((point, index) => index === 0 || !sameLatLng(point, points[index - 1]));
    }, [segments]);
    const [, setTourRunning] = useTour(controller, tourPoints, { loop: true });

    // Recenter the active view on the selected segment's first geo-tagged point
    // whenever the selection changes. `controller.flyTo` interrupts any in-flight
    // tween on the same globe.
    const lastRecenterRef = useRef<string | undefined>(undefined);
    useEffect(() => {
      if (!selectedSegmentId) {
        return;
      }
      if (lastRecenterRef.current === selectedSegmentId) {
        return;
      }
      const segment = segments.find((seg) => seg.id === selectedSegmentId);
      const point = segment ? segmentAnchor(segment) : undefined;
      if (!point) {
        return;
      }

      lastRecenterRef.current = selectedSegmentId;
      if (variant === 'map') {
        mapController?.setCenter(point);
      } else {
        void controller?.flyTo(point).catch(() => {});
      }
    }, [controller, mapController, variant, segments, selectedSegmentId]);

    // Geo `Action` controls: 'toggle' switches variant; 'start' plays/pauses the globe tour.
    const handleAction = useCallback(
      (action: ControlAction) => {
        switch (action) {
          case 'toggle':
            onVariantToggle?.();
            break;
          case 'start':
            setTourRunning((running) => !running);
            break;
        }
      },
      [onVariantToggle, setTourRunning],
    );

    // Click on the globe canvas → nearest segment.
    const handleSelectNearest = useCallback(
      (clientX: number, clientY: number) => {
        if (!controller?.canvas || !controller.projection) {
          return;
        }
        const rect = controller.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const coords = controller.projection.invert?.([x, y]);
        if (!coords) {
          return;
        }
        const [lng, lat] = coords;
        const click: LatLng = { lat, lng };

        let bestId: string | undefined;
        let bestDist = Infinity;
        for (const seg of segments) {
          for (const point of segmentPoints(seg)) {
            const distance = distanceSq(point, click);
            if (distance < bestDist) {
              bestDist = distance;
              bestId = seg.id;
            }
          }
        }
        // Threshold (~5 degrees) so clicks on empty water don't accidentally hit a far-away segment.
        if (bestId && bestDist < 25) {
          onSelect?.(bestId);
        }
      },
      [controller, segments, onSelect],
    );

    useEffect(() => {
      const canvas = controller?.canvas;
      if (!canvas) {
        return;
      }
      const handler = (event: MouseEvent) => handleSelectNearest(event.clientX, event.clientY);
      canvas.addEventListener('click', handler);
      return () => canvas.removeEventListener('click', handler);
    }, [controller?.canvas, handleSelectNearest]);

    return (
      <div {...composableProps(props, { classNames: 'relative h-full w-full overflow-hidden' })} ref={forwardedRef}>
        {variant === 'map' ? (
          <GeoMap.Root classNames='absolute inset-0'>
            <GeoMap.Content ref={setMapController}>
              <GeoMap.Tiles />
              <GeoMap.Markers markers={markers} selected={selectedSegmentId ? [selectedSegmentId] : undefined} />
              <GeoMap.Zoom onAction={handleMapZoom} />
              <GeoMap.Action onAction={handleAction} />
            </GeoMap.Content>
          </GeoMap.Root>
        ) : (
          <Globe.Root classNames='absolute inset-0' zoom={initialZoom} rotation={initialRotation}>
            <Globe.Canvas ref={setController} topology={topology} styles={styles} features={features} />
            <Globe.Zoom onAction={handleGlobeZoom} />
            <Globe.Action onAction={handleAction} />
          </Globe.Root>
        )}
      </div>
    );
  },
);

TripMapView.displayName = 'TripMapView';
