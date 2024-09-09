//
// Copyright 2024 DXOS.org
//

import * as d3 from 'd3';
import { useEffect, useState } from 'react';
import versor from 'versor';

import { type Vector } from './context';
import type { GlobeController } from '../components';
import type { Features, LatLng, StyleSet } from '../util';

// TODO(burdon): Types.
const getPoint = ({ lat, lng }: LatLng): [number, number] => [lng, lat];
const pointToVector = ([lng, lat]: number[], tilt: number): Vector => [-lng, tilt - lat, 0];

const TRANSITION_NAME = 'tour';

const defaultDuration = 1_500;

export type TourOptions = {
  disabled?: boolean;
  styles?: StyleSet;
  duration?: number;
};

/**
 * Iterates between points.
 * Inspired by: https://observablehq.com/@mbostock/top-100-cities
 */
export const useTour = (controller?: GlobeController | null, features?: Features, options: TourOptions = {}) => {
  const selection = d3.selection();
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) {
      selection.interrupt(TRANSITION_NAME);
      return;
    }

    let t: ReturnType<typeof setTimeout>;
    if (controller && running) {
      t = setTimeout(async () => {
        const { getCanvas, projection, setRotation } = controller;
        const canvas = getCanvas();
        const context = canvas.getContext('2d');
        const path = d3.geoPath(projection, context).pointRadius(2);

        const tilt = 0;
        let last: LatLng;
        try {
          for (const next of features.points) {
            if (!running) {
              break;
            }

            // Points.
            const p1 = last ? getPoint(last) : undefined;
            const p2 = getPoint(next);
            const ip = d3.geoInterpolate(p1 || p2, p2);
            const distance = d3.geoDistance(p1 || p2, p2);

            // Rotation.
            const r1 = p1 ? pointToVector(p1, tilt) : controller.projection.rotate();
            const r2 = pointToVector(p2, tilt);
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
                  context.fillStyle = 'red';
                  path({ type: 'Point', coordinates: ip(t2) });
                  context.fill();

                  context.beginPath();
                  context.strokeStyle = options?.styles?.line?.strokeStyle;
                  context.lineWidth = 3;
                  context.setLineDash([4, 4]);
                  path({ type: 'LineString', coordinates: [ip(t1), ip(t2)] });
                  context.stroke();
                }
                context.restore();

                // TODO(burdon): This has to come after rendering above. Add to features.
                projection.rotate(iv(t));
                setRotation(projection.rotate());
              });

            // Throws if interrupted.
            await transition.end();
            last = next;
          }
        } catch (err) {
          setRunning(false);
        }
      });

      return () => {
        clearTimeout(t);
        selection.interrupt(TRANSITION_NAME);
      };
    }
  }, [controller, running]);

  return [
    () => {
      if (!options.disabled) {
        setRunning(true);
      }
    },
    () => setRunning(false),
  ];
};
