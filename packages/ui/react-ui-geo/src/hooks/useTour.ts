//
// Copyright 2024 DXOS.org
//

import { geoInterpolate, geoPath } from 'd3';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

import type { GlobeController } from './context';
import { type LatLngLiteral } from '../types';
import { type StyleSet, geoToPosition } from '../util';

const defaultDuration = 1_500;

export type TourOptions = {
  running?: boolean;
  disabled?: boolean;
  duration?: number;
  loop?: boolean;
  tilt?: number;
  autoRotate?: boolean;
  styles?: StyleSet;
};

/**
 * Iterates between points by chaining `controller.flyTo` calls, rendering
 * an arc + cursor on the canvas per frame via the flyTo `onTick` hook.
 * Inspired by: https://observablehq.com/@mbostock/top-100-cities
 */
export const useTour = (
  controller?: GlobeController | null,
  points?: LatLngLiteral[],
  options: TourOptions = {},
): [boolean, Dispatch<SetStateAction<boolean>>] => {
  // TODO(burdon): Redo controlled state.
  const [running, setRunning] = useState(options.running ?? false);
  useEffect(() => {
    if (!controller || !running) {
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      const { canvas, projection } = controller;
      const context = canvas.getContext('2d', { alpha: false });
      const path = geoPath(projection, context).pointRadius(2);

      try {
        const tourPoints = [...points];
        if (options.loop) {
          tourPoints.push(tourPoints[0]);
        }

        let last: LatLngLiteral | undefined;
        for (const next of tourPoints) {
          if (cancelled) {
            break;
          }

          const p1 = last ? geoToPosition(last) : undefined;
          const p2 = geoToPosition(next);
          const ip = geoInterpolate(p1 ?? p2, p2);

          // Cursor + trailing arc render per frame. Must run before the
          // rotation tween advances the projection — flyTo registers
          // `onTick` before its rotation tween, preserving this ordering.
          const onTick = (t: number) => {
            const t1 = Math.max(0, Math.min(1, t * 2 - 1));
            const t2 = Math.min(1, t * 2);

            context.save();
            try {
              context.beginPath();
              context.strokeStyle = options.styles?.arc?.strokeStyle ?? 'yellow';
              context.lineWidth = (options.styles?.arc?.lineWidth ?? 1.5) * (controller.zoom ?? 1);
              context.setLineDash(options.styles?.arc?.lineDash ?? []);
              path({ type: 'LineString', coordinates: [ip(t1), ip(t2)] });
              context.stroke();

              context.beginPath();
              context.fillStyle = options.styles?.cursor?.fillStyle ?? 'orange';
              path.pointRadius((options.styles?.cursor?.pointRadius ?? 2) * (controller.zoom ?? 1));
              path({ type: 'Point', coordinates: ip(t2) });
              context.fill();
            } finally {
              context.restore();
            }
          };

          await controller.flyTo(next, {
            duration: options.duration ?? defaultDuration,
            tilt: options.tilt ?? 0,
            onTick,
          });
          last = next;
        }
      } catch {
        // Interrupted (e.g. external flyTo or tour stopped).
      } finally {
        if (!cancelled) {
          setRunning(false);
        }
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(t);
      controller.cancelFlyTo();
    };
  }, [controller, running, JSON.stringify(options)]);

  return [running, setRunning];
};
