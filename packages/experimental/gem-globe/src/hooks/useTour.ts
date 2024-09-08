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

export type TourOptions = {
  disabled?: boolean;
  styles?: StyleSet;
};

export const useTour = (controller?: GlobeController | null, features?: Features, options: TourOptions = {}) => {
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (controller && running) {
      void startTour(controller, features, options).then(() => setRunning(false));
    }
  }, [controller, running]);

  // TODO(burdon): Stop.
  return [
    () => {
      if (!options.disabled) {
        setRunning(true);
      }
    },
    () => setRunning(false),
  ];
};

// TODO(burdon): Generator.
const startTour = async (controller: GlobeController, features: Features, options: TourOptions) => {
  const { getCanvas, projection, setRotation } = controller;
  const canvas = getCanvas();
  const context = canvas.getContext('2d');
  const path = d3.geoPath(projection, context).pointRadius(2);

  const tilt = 0;
  let last: LatLng;
  for (const next of features.points) {
    // Points.
    const p1 = last ? getPoint(last) : undefined;
    const p2 = getPoint(next);
    const ip = d3.geoInterpolate(p1 || p2, p2);
    const distance = d3.geoDistance(p1 || p2, p2);

    // Rotation.
    const r1 = p1 ? pointToVector(p1, tilt) : controller.projection.rotate();
    const r2 = pointToVector(p2, tilt);
    const iv = versor.interpolate(r1, r2);

    await d3
      .transition()
      .duration(Math.max(2_000, distance * 2_000))
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
      })
      .end();

    last = next;
  }
};
