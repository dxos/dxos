//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { IconButton, composable, composableProps, useThemeContext } from '@dxos/react-ui';
import {
  Globe,
  type GlobeController,
  globeStyles,
  useDrag,
  useGlobeZoomHandler,
  useTour,
  useWheel,
} from '@dxos/react-ui-geo';
import { loadTopology } from '@dxos/react-ui-geo/data';

import { Segment } from '#types';

import { type SegmentCardAction } from '../SegmentCard';
import { SegmentStack } from '../SegmentStack';

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

/** All points referenced by a segment (origin, destination), with geo coords if present. */
const segmentPoints = (seg: Segment.Segment): LatLng[] => {
  const points: LatLng[] = [];
  const origin = toLatLng(Segment.getOrigin(seg)?.geo);
  const destination = toLatLng(Segment.getDestination(seg)?.geo);
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
  const source = toLatLng(seg.details.origin?.geo);
  const target = toLatLng(seg.details.destination?.geo);
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

export type TripMapViewProps = {
  segments: Segment.Segment[];
  selectedSegmentId?: string;
  onSelect?: (segmentId: string) => void;
};

/**
 * Map view for a Trip. Two-column layout: itinerary list on the left, globe
 * on the right. The globe plots each segment's geo-tagged origin,
 * destination, and venue as points; transport segments add origin→destination
 * arcs.
 *
 * Selecting a segment in the itinerary (or via SegmentArticle) smoothly
 * animates the globe to that segment's first geo-tagged point using a
 * great-circle interpolation (`controller.flyTo`). Clicking a point on the globe
 * selects the nearest segment via the `onSelect` callback.
 *
 * Composable: the root <div> forwards refs and merges incoming
 * `className`/`classNames` so the component can be used with `asChild`
 * slots (e.g. inside `Panel.Content asChild`).
 */
export const TripMapView = composable<HTMLDivElement, TripMapViewProps>(
  ({ segments, selectedSegmentId, onSelect, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const [topology, setTopology] = useState<Awaited<ReturnType<typeof loadTopology>>>();
    const [controller, setController] = useState<GlobeController | null>();
    const styles = useMemo(() => globeStyles(themeMode), [themeMode]);

    useEffect(() => {
      void loadTopology().then(setTopology);
    }, []);

    const handleZoom = useGlobeZoomHandler(controller);
    useWheel(controller);
    useDrag(controller);

    // Build the geo features.
    const features = useMemo(() => {
      const points: LatLng[] = [];
      const lines: { source: LatLng; target: LatLng }[] = [];
      for (const seg of segments) {
        for (const p of segmentPoints(seg)) {
          if (!points.some((q) => sameLatLng(q, p))) {
            points.push(p);
          }
        }
        const line = segmentLine(seg);
        if (line) {
          lines.push(line);
        }
      }
      return { points, lines };
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
    const [tourRunning, setTourRunning] = useTour(controller, tourPoints, { loop: true });

    // Recenter the globe on the selected segment's first geo-tagged point
    // whenever the selection changes. `controller.flyTo` interrupts any
    // in-flight tween on the same globe.
    const lastRecenterRef = useRef<string | undefined>(undefined);
    useEffect(() => {
      if (!controller || !selectedSegmentId) {
        return;
      }
      if (lastRecenterRef.current === selectedSegmentId) {
        return;
      }
      const segment = segments.find((s) => s.id === selectedSegmentId);
      const point = segment ? segmentPoints(segment)[0] : undefined;
      if (!point) {
        return;
      }

      lastRecenterRef.current = selectedSegmentId;
      void controller.flyTo(point).catch(() => {});
    }, [controller, segments, selectedSegmentId]);

    // Bridge SegmentStack actions to the parent's selection callback.
    const handleStackAction = useCallback(
      (action: SegmentCardAction) => {
        if (action.type === 'current' || action.type === 'select') {
          onSelect?.(action.segmentId);
        }
      },
      [onSelect],
    );

    // Click on the canvas → nearest segment.
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
            const d = distanceSq(point, click);
            if (d < bestDist) {
              bestDist = d;
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
      <div
        {...composableProps(props, {
          classNames: 'grid grid-cols-[calc(var(--spacing-card-min-width)+2rem)_1fr] h-full w-full overflow-hidden',
        })}
        ref={forwardedRef}
      >
        <aside
          aria-label='Itinerary'
          className='flex flex-col overflow-hidden border-r border-subdued-separator bg-base-surface'
        >
          {segments.length === 0 ? (
            <div className='p-3 text-sm text-description'>No segments yet.</div>
          ) : (
            <SegmentStack
              id='trip-map-itinerary'
              segments={segments}
              currentId={selectedSegmentId}
              onAction={handleStackAction}
              classNames='flex-1 overflow-hidden'
            />
          )}
        </aside>

        <div className='relative overflow-hidden'>
          <Globe.Root classNames='absolute inset-0' zoom={initialZoom} rotation={initialRotation}>
            <Globe.Canvas ref={setController} topology={topology} styles={styles} features={features} />
            <Globe.Zoom onAction={handleZoom} />
          </Globe.Root>

          {/* Tour play/pause */}
          {tourPoints.length > 1 && (
            <div className='absolute top-3 right-3 z-10'>
              <IconButton
                variant='ghost'
                icon={tourRunning ? 'ph--pause--regular' : 'ph--play--regular'}
                iconOnly
                label={tourRunning ? 'Pause tour' : 'Play tour'}
                onClick={() => setTourRunning((r) => !r)}
                classNames='bg-base-surface/70 backdrop-blur'
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

TripMapView.displayName = 'TripMapView';
