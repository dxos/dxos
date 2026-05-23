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
  /**
   * Optional pitch / tilt offset (in degrees) applied along the latitude axis.
   * Defaults to 0 so the target lat/lng ends up exactly at the centre of the
   * view. Set non-zero to render the target offset vertically from centre.
   */
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
      // Default tilt to 0 so the target ends up exactly centred. Callers can
      // override (e.g. to preserve a constant pitch across selections).
      const effectiveTilt = tilt ?? 0;
      const r2 = positionToRotation(p2, effectiveTilt);
      // Approximate current view centre from rotation for great-circle distance scaling.
      const p1: [number, number] = [-r1[0], -r1[1]];
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
