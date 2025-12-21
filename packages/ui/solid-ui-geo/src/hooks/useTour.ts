//
// Copyright 2025 DXOS.org
//

import { selection as d3Selection, geoDistance, geoInterpolate, geoPath } from 'd3';
import { type Accessor, type Setter, createEffect, createSignal, onCleanup } from 'solid-js';
import versor from 'versor';

import type { GlobeController } from '../components';
import { type LatLngLiteral } from '../types';
import { type StyleSet, geoToPosition, positionToRotation } from '../util';

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
export const useTour = (
  controller?: GlobeController | null,
  points?: LatLngLiteral[],
  options: TourOptions = {},
): { running: Accessor<boolean>; setRunning: Setter<boolean> } => {
  const selection = d3Selection();
  const [running, setRunning] = createSignal(options.running ?? false);

  createEffect(() => {
    if (!running()) {
      selection.interrupt(TRANSITION_NAME);
      return;
    }

    let t: ReturnType<typeof setTimeout>;
    if (controller && running()) {
      t = setTimeout(async () => {
        const { canvas, projection, setRotation } = controller;
        const context = canvas.getContext('2d', { alpha: false });
        const path = geoPath(projection, context).pointRadius(2);

        const tilt = options.tilt ?? 0;
        let last: LatLngLiteral;
        try {
          const p = [...(points ?? [])];
          if (options.loop) {
            p.push(p[0]);
          }

          for (const next of p) {
            if (!running()) {
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

            const transition = selection
              .transition(TRANSITION_NAME)
              .duration(Math.max(options.duration ?? defaultDuration, distance * 2_000))
              .tween('render', () => (t) => {
                const t1 = Math.max(0, Math.min(1, t * 2 - 1));
                const t2 = Math.min(1, t * 2);

                context.save();
                {
                  context.beginPath();
                  context.strokeStyle = options?.styles?.arc?.strokeStyle ?? 'yellow';
                  context.lineWidth = (options?.styles?.arc?.lineWidth ?? 1.5) * (controller?.zoom ?? 1);
                  context.setLineDash(options?.styles?.arc?.lineDash ?? []);
                  path({ type: 'LineString', coordinates: [ip(t1), ip(t2)] });
                  context.stroke();

                  context.beginPath();
                  context.fillStyle = options?.styles?.cursor?.fillStyle ?? 'orange';
                  path.pointRadius((options?.styles?.cursor?.pointRadius ?? 2) * (controller?.zoom ?? 1));
                  path({ type: 'Point', coordinates: ip(t2) });
                  context.fill();
                }
                context.restore();

                // TODO(burdon): This has to come after rendering above. Add to features to correct order?
                projection.rotate(iv(t));
                setRotation(projection.rotate());
              });

            // Throws if interrupted.
            await transition.end();
            last = next;
          }
        } catch {
          // Ignore.
        } finally {
          setRunning(false);
        }
      });

      onCleanup(() => {
        clearTimeout(t);
        selection.interrupt(TRANSITION_NAME);
      });
    }
  });

  return { running, setRunning };
};
