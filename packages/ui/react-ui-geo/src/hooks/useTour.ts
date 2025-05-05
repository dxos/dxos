//
// Copyright 2024 DXOS.org
//

<<<<<<< HEAD
import { selection, geoPath, geoInterpolate, geoDistance } from 'd3';
import { useEffect, useState } from 'react';
=======
import * as d3 from 'd3';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
>>>>>>> origin/main
import versor from 'versor';

import { log } from '@dxos/log';

import type { GlobeController } from '../components';
import { geoToPosition, type LatLng, positionToRotation, type StyleSet } from '../util';

const TRANSITION_NAME = 'globe-tour';

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
 * Iterates between points.
 * Inspired by: https://observablehq.com/@mbostock/top-100-cities
 */
<<<<<<< HEAD
export const useTour = (controller?: GlobeController | null, features?: Features, options: TourOptions = {}) => {
  const sel = selection();
  const [running, setRunning] = useState(false);
=======
export const useTour = (
  controller?: GlobeController | null,
  points?: LatLng[],
  options: TourOptions = {},
): [boolean, Dispatch<SetStateAction<boolean>>] => {
  const selection = d3.selection();
  const [running, setRunning] = useState(options.running ?? false);
>>>>>>> origin/main
  useEffect(() => {
    if (!running) {
      sel.interrupt(TRANSITION_NAME);
      return;
    }

    let t: ReturnType<typeof setTimeout>;
    if (controller && running) {
      t = setTimeout(async () => {
        const { canvas, projection, setRotation } = controller;
        const context = canvas.getContext('2d', { alpha: false });
        const path = geoPath(projection, context).pointRadius(2);

        const tilt = options.tilt ?? 0;
        let last: LatLng;
        try {
          const p = [...points];
          if (options.loop) {
            p.push(p[0]);
          }

          for (const next of p) {
            if (!running) {
              break;
            }

            // Points.
            const p1 = last ? geoToPosition(last) : undefined;
            const p2 = geoToPosition(next);
            const ip = geoInterpolate(p1 || p2, p2);
            const distance = geoDistance(p1 || p2, p2);

            // Rotation.
            const r1 = p1 ? positionToRotation(p1, tilt) : controller.projection.rotate();
            const r2 = positionToRotation(p2, tilt);
            const iv = versor.interpolate(r1, r2);

            const transition = sel
              .transition(TRANSITION_NAME)
              .duration(Math.max(options.duration ?? defaultDuration, distance * 2_000))
              .tween('render', () => (t) => {
                const t1 = Math.max(0, Math.min(1, t * 2 - 1));
                const t2 = Math.min(1, t * 2);

                context.save();
                {
                  context.beginPath();
                  context.strokeStyle = options?.styles?.arc?.strokeStyle ?? 'yellow';
                  context.lineWidth = (options?.styles?.arc?.lineWidth ?? 1.5) * (controller?.scale ?? 1);
                  context.setLineDash(options?.styles?.arc?.lineDash ?? []);
                  path({ type: 'LineString', coordinates: [ip(t1), ip(t2)] });
                  context.stroke();

                  context.beginPath();
                  context.fillStyle = options?.styles?.cursor?.fillStyle ?? 'orange';
                  path.pointRadius((options?.styles?.cursor?.pointRadius ?? 2) * (controller?.scale ?? 1));
                  path({ type: 'Point', coordinates: ip(t2) });
                  context.fill();
                }
                context.restore();

                // TODO(burdon): This has to come after rendering above. Add to features to correct order?
                if (options.autoRotate) {
                  projection.rotate(iv(t));
                  setRotation(projection.rotate());
                }
              });

            // Throws if interrupted.
            await transition.end();
            last = next;
          }
        } catch (err) {
          log.catch(err);
        } finally {
          setRunning(false);
        }
      });

      return () => {
        clearTimeout(t);
        sel.interrupt(TRANSITION_NAME);
      };
    }
  }, [controller, running, JSON.stringify(options)]);

  return [running, setRunning];
};
