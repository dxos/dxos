//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, { useMemo, useState } from 'react';

import { Icon } from '@dxos/react-ui';
import { Globe, type GlobeController, useDrag, useGlobeZoomHandler } from '@dxos/react-ui-geo';
import { loadTopology } from '@dxos/react-ui-geo/data';

import { Segment } from '#types';

const mapStyles = {
  water: { fillStyle: '#0a0a0a' },
  land: { fillStyle: '#262626', strokeStyle: '#1a1a1a' },
  border: { strokeStyle: '#1a1a1a' },
  graticule: { strokeStyle: '#111' },
  line: { lineWidth: 1.5, lineDash: [4, 8], strokeStyle: '#60a5fa' },
  point: { pointRadius: 3, fillStyle: '#f59e0b' },
  arc: { lineWidth: 2, strokeStyle: '#60a5fa' },
};

const initialRotation: [number, number, number] = [0, -20, 0];

type LatLng = { lat: number; lng: number };

const toLatLng = (geo?: readonly [number, number, number?] | undefined): LatLng | undefined => {
  if (!geo || geo.length < 2) {
    return undefined;
  }
  const [lng, lat] = geo;
  return { lat, lng };
};

/** All points referenced by a segment (origin, destination, venue), with geo coords if present. */
const segmentPoints = (seg: Segment.Segment): LatLng[] => {
  const points: LatLng[] = [];
  const origin = toLatLng(seg.origin?.geo);
  const destination = toLatLng(seg.destination?.geo);
  const venue = toLatLng(seg.venue?.geo);
  if (origin) {
    points.push(origin);
  }
  // Avoid duplicating for lodging where origin === destination.
  if (destination && (!origin || destination.lat !== origin.lat || destination.lng !== origin.lng)) {
    points.push(destination);
  }
  if (venue && !points.some((p) => p.lat === venue.lat && p.lng === venue.lng)) {
    points.push(venue);
  }
  return points;
};

/** Origin → destination line for transport segments (skip lodging / activity). */
const segmentLine = (seg: Segment.Segment): { source: LatLng; target: LatLng } | undefined => {
  if (seg.kind === 'lodging' || seg.kind === 'activity') {
    return undefined;
  }
  const source = toLatLng(seg.origin?.geo);
  const target = toLatLng(seg.destination?.geo);
  if (!source || !target) {
    return undefined;
  }
  if (source.lat === target.lat && source.lng === target.lng) {
    return undefined;
  }
  return { source, target };
};

/** Compact card: kind icon, title, primary date — for the floating itinerary. */
const CompactSegmentRow = ({ segment, onClick }: { segment: Segment.Segment; onClick?: () => void }) => {
  const title = Segment.getTitle(segment);
  const date = Segment.getPrimaryDate(segment);
  const icon = Segment.kindIcon(segment.kind);
  return (
    <button
      type='button'
      onClick={onClick}
      className='flex items-center gap-2 w-full text-left px-2 py-2 rounded hover:bg-input-surface'
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
  onSelect?: (segmentId: string) => void;
};

/**
 * Map view for a Trip. Renders a globe with every segment's geo-tagged origin,
 * destination, and venue plotted as points; transport segments add an arc from
 * origin to destination. A floating itinerary panel on the right lists each
 * segment as a compact card.
 */
export const TripMapView = ({ segments, onSelect }: TripMapViewProps) => {
  const [topology, setTopology] = useState<Awaited<ReturnType<typeof loadTopology>>>();
  const [controller, setController] = useState<GlobeController | null>();

  React.useEffect(() => {
    void loadTopology().then(setTopology);
  }, []);

  const handleZoom = useGlobeZoomHandler(controller);
  useDrag(controller);

  const features = useMemo(() => {
    const points: LatLng[] = [];
    const lines: { source: LatLng; target: LatLng }[] = [];
    for (const seg of segments) {
      for (const p of segmentPoints(seg)) {
        if (!points.some((q) => q.lat === p.lat && q.lng === p.lng)) {
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

  return (
    <div className='relative h-full w-full overflow-hidden bg-black'>
      <Globe.Root classNames='absolute inset-0' zoom={3} rotation={initialRotation}>
        <Globe.Canvas ref={setController} topology={topology} styles={mapStyles} features={features} />
        <Globe.Zoom onAction={handleZoom} />
      </Globe.Root>

      {/* Floating itinerary panel. */}
      <aside
        aria-label='Itinerary'
        className='absolute top-4 left-4 bottom-4 w-72 rounded-lg bg-base-surface/95 backdrop-blur shadow-lg flex flex-col overflow-hidden'
      >
        <div className='shrink-0 px-3 py-2 text-sm font-medium border-b border-subdued-separator'>Itinerary</div>
        <div className='flex-1 overflow-y-auto p-1'>
          {segments.length === 0 ? (
            <div className='p-3 text-sm text-description'>No segments yet.</div>
          ) : (
            segments.map((segment) => (
              <CompactSegmentRow key={segment.id} segment={segment} onClick={() => onSelect?.(segment.id)} />
            ))
          )}
        </div>
      </aside>
    </div>
  );
};
