//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Icon, IconButton, useThemeContext } from '@dxos/react-ui';
import {
  Globe,
  type GlobeController,
  geoToPosition,
  globeStyles,
  positionToRotation,
  useDrag,
  useGlobeZoomHandler,
  useTour,
} from '@dxos/react-ui-geo';
import { loadTopology } from '@dxos/react-ui-geo/data';
import { composable, composableProps, mx } from '@dxos/ui-theme';

import { Segment } from '#types';

const initialRotation: [number, number, number] = [0, -20, 0];
const TILT = initialRotation[1];

type LatLng = { lat: number; lng: number };

const toLatLng = (geo?: readonly [number, number, number?] | undefined): LatLng | undefined => {
  if (!geo || geo.length < 2) {
    return undefined;
  }
  const [lng, lat] = geo;
  return { lat, lng };
};

const sameLatLng = (a: LatLng, b: LatLng): boolean => a.lat === b.lat && a.lng === b.lng;

/** All points referenced by a segment (origin, destination, venue), with geo coords if present. */
const segmentPoints = (seg: Segment.Segment): LatLng[] => {
  const points: LatLng[] = [];
  const origin = toLatLng(seg.origin?.geo);
  const destination = toLatLng(seg.destination?.geo);
  const venue = toLatLng(seg.venue?.geo);
  if (origin) {
    points.push(origin);
  }
  // Avoid duplicating for accommodation where origin === destination.
  if (destination && (!origin || !sameLatLng(destination, origin))) {
    points.push(destination);
  }
  if (venue && !points.some((p) => sameLatLng(p, venue))) {
    points.push(venue);
  }
  return points;
};

/** Origin → destination line for transport segments (skip accommodation / activity). */
const segmentLine = (seg: Segment.Segment): { source: LatLng; target: LatLng } | undefined => {
  if (seg.kind === 'accommodation' || seg.kind === 'activity') {
    return undefined;
  }
  const source = toLatLng(seg.origin?.geo);
  const target = toLatLng(seg.destination?.geo);
  if (!source || !target || sameLatLng(source, target)) {
    return undefined;
  }
  return { source, target };
};

/** Time interval covered by a segment, in ms. Single-point segments report a point interval. */
const segmentInterval = (seg: Segment.Segment): { start: number; end: number } | undefined => {
  const primary = Segment.getPrimaryDate(seg);
  if (!primary) {
    return undefined;
  }
  const start = primary.getTime();
  const endIso = seg.kind === 'accommodation' ? seg.checkOut : seg.arriveAt;
  const end = Segment.parseDate(endIso)?.getTime() ?? start;
  return { start, end };
};

/** Great-circle squared-distance heuristic for nearest-point search. */
const distanceSq = (a: LatLng, b: LatLng): number => {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
};

/** Compact row: kind icon, title, primary date — for the itinerary column. */
const CompactSegmentRow = ({
  segment,
  active,
  selected,
  onClick,
}: {
  segment: Segment.Segment;
  active?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) => {
  const title = Segment.getTitle(segment);
  const date = Segment.getPrimaryDate(segment);
  const icon = Segment.kindIcon(segment.kind);
  return (
    <button
      type='button'
      onClick={onClick}
      className={mx(
        'flex items-center gap-2 w-full text-left px-3 py-2 rounded hover:bg-input-surface',
        selected && 'bg-input-surface',
        active && !selected && 'bg-attentionSurface/40',
      )}
    >
      <Icon icon={icon} size={4} />
      <div className='flex-1 min-w-0'>
        <div className='text-sm truncate'>{title}</div>
        {date && <div className='text-xs text-description'>{format(date, 'MMM d, p')}</div>}
      </div>
    </button>
  );
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
 * Toolbar (top-right of the globe area) hosts a play/pause button that
 * animates a tour through the trip's points (4.1). A range slider along the
 * bottom scrubs through the trip's time range — segments active at the
 * current scrubber value are highlighted in the itinerary column (4.2).
 * Clicking a point on the globe selects the nearest segment via the
 * `onSelect` callback; the matching row in the itinerary column is
 * highlighted (4.3). The Globe.Canvas API doesn't currently support
 * per-point styling, so the selected point is not visually distinguished
 * on the globe itself.
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
    // Lock the camera tilt — drag rotates the globe around its polar axis
    // only, keeping the inclination set by the `rotation` prop above.
    useDrag(controller, { lockTilt: true });

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

    // Tour (4.1).
    const tourPoints = useMemo(
      () =>
        segments
          .flatMap((seg) => segmentPoints(seg))
          .filter((p, i, arr) => arr.findIndex((q) => sameLatLng(p, q)) === i),
      [segments],
    );
    const [tourRunning, setTourRunning] = useTour(controller, tourPoints, { loop: true });

    // Time scrubber (4.2).
    const intervals = useMemo(() => {
      return segments
        .map((seg) => ({ id: seg.id, interval: segmentInterval(seg) }))
        .filter((x): x is { id: string; interval: { start: number; end: number } } => !!x.interval);
    }, [segments]);
    const range = useMemo(() => {
      if (intervals.length === 0) {
        return undefined;
      }
      let min = Infinity;
      let max = -Infinity;
      for (const { interval } of intervals) {
        if (interval.start < min) {
          min = interval.start;
        }
        if (interval.end > max) {
          max = interval.end;
        }
      }
      return min < max ? { min, max } : { min, max: min + 86400000 };
    }, [intervals]);
    const [scrubMs, setScrubMs] = useState<number | undefined>(undefined);
    useEffect(() => {
      // Reset scrubber when the time range changes.
      setScrubMs(undefined);
    }, [range?.min, range?.max]);

    /**
     * Pick the segment whose interval contains the scrubber's current value.
     * If multiple overlap (e.g. a flight during a hotel stay), prefer the
     * one with the latest start so the more specific (shorter) segment
     * "wins" and the user sees the in-flight focus.
     */
    const scrubberSegmentId = useMemo(() => {
      if (scrubMs === undefined) {
        return undefined;
      }
      let bestId: string | undefined;
      let bestStart = -Infinity;
      for (const { id, interval } of intervals) {
        if (scrubMs >= interval.start && scrubMs <= interval.end && interval.start >= bestStart) {
          bestId = id;
          bestStart = interval.start;
        }
      }
      return bestId;
    }, [intervals, scrubMs]);

    // Drive the parent's selection from the scrubber: when the active segment
    // changes (as the user drags), notify via onSelect. We don't want to fire
    // continuously while sitting on the same active segment.
    const lastScrubSelectionRef = useRef<string | undefined>(undefined);
    useEffect(() => {
      if (scrubberSegmentId && scrubberSegmentId !== lastScrubSelectionRef.current) {
        lastScrubSelectionRef.current = scrubberSegmentId;
        onSelect?.(scrubberSegmentId);
      }
    }, [scrubberSegmentId, onSelect]);

    /**
     * Recenter the globe on the selected segment's first geo-tagged point
     * whenever the selection changes (either from the scrubber driving
     * onSelect or from external sources like the SegmentArticle companion).
     * Preserves the locked tilt by re-applying it as the second axis of the
     * rotation.
     */
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
      const [lambda] = positionToRotation(geoToPosition(point));
      controller.setRotation([lambda, TILT, 0]);
    }, [controller, segments, selectedSegmentId]);

    // Selection sync (4.3): click on the canvas → nearest segment.
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
          classNames: 'grid grid-cols-[16rem_1fr] h-full w-full overflow-hidden bg-black',
        })}
        ref={forwardedRef}
      >
        <aside
          aria-label='Itinerary'
          className='flex flex-col overflow-hidden border-r border-subdued-separator bg-base-surface'
        >
          <div className='shrink-0 px-3 py-2 text-sm font-medium border-b border-subdued-separator'>Itinerary</div>
          <div className='flex-1 overflow-y-auto p-1'>
            {segments.length === 0 ? (
              <div className='p-3 text-sm text-description'>No segments yet.</div>
            ) : (
              segments.map((segment) => (
                <CompactSegmentRow
                  key={segment.id}
                  segment={segment}
                  selected={segment.id === selectedSegmentId}
                  active={segment.id === scrubberSegmentId}
                  onClick={() => onSelect?.(segment.id)}
                />
              ))
            )}
          </div>
        </aside>

        <div className='relative overflow-hidden'>
          <Globe.Root classNames='absolute inset-0' zoom={1.2} rotation={initialRotation}>
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

          {/* Time scrubber */}
          {range && (
            <div className='absolute bottom-3 left-3 right-3 z-10 flex items-center gap-2 px-3 py-2 rounded bg-base-surface/80 backdrop-blur'>
              <span className='text-xs text-description shrink-0'>{format(range.min, 'MMM d')}</span>
              <input
                type='range'
                min={range.min}
                max={range.max}
                value={scrubMs ?? range.min}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setScrubMs(Number(e.target.value))}
                className='flex-1'
                aria-label='Trip time scrubber'
              />
              <span className='text-xs text-description shrink-0'>{format(range.max, 'MMM d')}</span>
              {scrubMs !== undefined && (
                <span className='text-xs text-description shrink-0 min-w-[6rem] text-right'>
                  {format(scrubMs, 'MMM d, p')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

TripMapView.displayName = 'TripMapView';
