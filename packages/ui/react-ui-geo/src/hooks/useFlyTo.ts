//
// Copyright 2026 DXOS.org
//

import { selection as d3Selection, geoDistance, interpolateNumber } from 'd3';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import versor from 'versor';

import { type GlobeController } from '../components';
import { type LatLngLiteral } from '../types';
import { geoToPosition, positionToRotation } from '../util';

const TRANSITION_NAME = 'globe-fly-to';

const defaultDuration = 1_200;

export type FlyToOptions = {
  /** Animation duration in ms; scales with great-circle distance like useTour. */
  duration?: number;
  /** Pitch / tilt (latitude rotation) to preserve. */
  tilt?: number;
};

export type FlyToTarget = {
  /** Optional zoom factor; interpolated alongside rotation when set. */
  zoom?: number;
} & LatLngLiteral;

/**
 * Returns a `flyTo` function that smoothly animates the globe's rotation
 * (and optionally zoom) to a target lat/lng using d3 transition +
 * versor.interpolate for great-circle motion. Calling `flyTo` again
 * interrupts the previous animation. The hook cleans up the pending
 * transition on unmount.
 */
export const useFlyTo = (controller?: GlobeController | null, options: FlyToOptions = {}) => {
  const selection = useMemo(() => d3Selection(), []);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(
    () => () => {
      selection.interrupt(TRANSITION_NAME);
    },
    [selection],
  );

  return useCallback(
    (target: FlyToTarget) => {
      if (!controller) {
        return;
      }

      const { projection, setRotation, setZoom, zoom: currentZoom } = controller;
      const { duration = defaultDuration, tilt } = optionsRef.current;

      const p2 = geoToPosition(target);
      const r1 = projection.rotate() as [number, number, number];
      // Effective tilt: preserve the current tilt unless the caller overrides it.
      const effectiveTilt = tilt ?? r1[1];
      const r2 = positionToRotation(p2, effectiveTilt);
      // Approximate current center from the rotation (assumes tilt=current) for duration scaling.
      const p1: [number, number] = [-r1[0], effectiveTilt - r1[1]];
      const distance = geoDistance(p1, p2);
      const iv = versor.interpolate(r1, r2);

      const targetZoom = target.zoom;
      const iz = targetZoom !== undefined ? interpolateNumber(currentZoom, targetZoom) : undefined;

      selection.interrupt(TRANSITION_NAME);
      selection
        .transition(TRANSITION_NAME)
        .duration(Math.max(duration, distance * 1_500))
        .tween('flyTo', () => (t: number) => {
          projection.rotate(iv(t));
          setRotation(projection.rotate() as [number, number, number]);
          if (iz) {
            setZoom(iz(t));
          }
        });
    },
    [controller, selection],
  );
};
