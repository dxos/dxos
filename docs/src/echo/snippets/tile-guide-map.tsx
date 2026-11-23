//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import {
  Globe,
  type GlobeController,
  type StyleSet,
  useDrag,
  useGlobeZoomHandler,
  useTour,
} from '@dxos/react-ui-geo';
import { loadTopology } from '@dxos/react-ui-geo/data';
import * as Hooks from '@dxos/react-ui/Hooks';

// #region globe
/** A trip around the world: London, New York, Tokyo, Sydney, São Paulo and back to London. */
const TRIP = [
  { lat: 51.5074, lng: -0.1278 },
  { lat: 40.7128, lng: -74.006 },
  { lat: 35.6762, lng: 139.6503 },
  { lat: -33.8688, lng: 151.2093 },
  { lat: -23.5505, lng: -46.6333 },
];

const LEGS = TRIP.map((source, index) => ({
  source,
  target: TRIP[(index + 1) % TRIP.length],
}));

const STYLES: Record<'light' | 'dark', StyleSet> = {
  light: {
    background: { fillStyle: '#EEE' },
    water: { fillStyle: '#555' },
    land: { fillStyle: '#999' },
    line: { strokeStyle: '#b91c1c', lineWidth: 1, lineDash: [4, 6] },
    point: { fillStyle: '#b91c1c', pointRadius: 3 },
    arc: { strokeStyle: '#f97316', lineWidth: 2 },
    cursor: { fillStyle: '#f97316', pointRadius: 3 },
  },
  dark: {
    background: { fillStyle: '#111' },
    water: { fillStyle: '#123E6A' },
    land: { fillStyle: '#032153' },
    line: { strokeStyle: '#fbbf24', lineWidth: 1, lineDash: [4, 6] },
    point: { fillStyle: '#f87171', pointRadius: 3 },
    arc: { strokeStyle: '#fbbf24', lineWidth: 2 },
    cursor: { fillStyle: '#fbbf24', pointRadius: 3 },
  },
};

/** The globe flies from stop to stop along the trip, over and over; drag it to take over, and the tour resumes after. */
export const TripGlobe = () => {
  const themeMode = Hooks.useThemeMode();
  // The country outlines load on demand, so the globe draws once they arrive.
  const [topology] = Hooks.useAsyncState(() => loadTopology('110m'), []);
  const [controller, setController] = useState<GlobeController | null>(null);
  const [dragging, setDragging] = useState(false);
  const handleZoom = useGlobeZoomHandler(controller);
  const styles = STYLES[themeMode];
  const [running, setRunning] = useTour(controller, TRIP, {
    loop: true,
    duration: 2_000,
    styles,
  });
  useDrag(controller, {
    onUpdate: ({ type }) => {
      setDragging(type !== 'end');
      if (type === 'start') {
        setRunning(false);
      }
    },
  });

  // Start a lap once the canvas is mounted, and again after a pause when a lap ends or the user lets go.
  useEffect(() => {
    if (running || dragging || !controller?.canvas) {
      return;
    }
    const timeout = setTimeout(() => setRunning(true), 1_500);
    return () => clearTimeout(timeout);
  }, [controller, running, dragging]);

  return (
    <Globe.Root zoom={1.1} rotation={[0, -20, 0]} ref={setController}>
      <Globe.Viewport>
        <Globe.Canvas
          topology={topology}
          styles={styles}
          features={{ points: TRIP, lines: LEGS }}
        />
        <Globe.Zoom onAction={handleZoom} />
      </Globe.Viewport>
    </Globe.Root>
  );
};
// #endregion
