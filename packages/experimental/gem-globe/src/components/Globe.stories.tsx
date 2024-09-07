//
// Copyright 2018 DXOS.org
//

import '@dxos-theme';

import { type GeoProjection } from 'd3';
import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { type Topology } from 'topojson-specification';
import versor from 'versor';

import { withTheme, withFullscreen } from '@dxos/storybook-utils';

// @ts-ignore
import Airports from '#data_airports.json';
// @ts-ignore
import Countries from '#data_countries-110m.json';
import { Globe, type GlobeController, type Vector } from './Globe';
import { useSpinner } from '../hooks';
import { type LatLng } from '../util';

// TODO(burdon): Local script (e.g., plot on chart) vs. remote functions.
// TODO(burdon): Globe plugin (add component to Map plugin).
// TODO(burdon): Add charts to sheet.
// TODO(burdon): Able to script (e.g., list of cities from named range).
// TODO(burdon): Search flight information. Calendar (itinerary).
// TODO(burdon): Show MANY packets flowing across the network.

export default {
  title: 'gem-globe/Globe',
  decorators: [withTheme, withFullscreen({ classNames: 'bg-[#111]' })],
};

const globeStyles1 = {
  water: {
    fillStyle: '#191919',
  },

  land: {
    fillStyle: '#444',
    strokeStyle: '#222',
  },

  border: {
    strokeStyle: '#1a1a1a',
  },

  graticule: {
    strokeStyle: '#151515',
  },
};

const globeStyles2 = {
  water: {
    fillStyle: '#000',
  },

  land: {
    fillStyle: '#050505',
    strokeStyle: 'darkgreen',
  },

  graticule: {
    strokeStyle: '#111',
  },

  line: {
    lineWidth: 1.5,
    lineDash: [4, 16],
    strokeStyle: 'yellow',
  },

  point: {
    radius: 0.2,
    fillStyle: 'red',
  },
};

export const Earth = () => {
  const { ref, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>();

  return (
    <div ref={ref} className='absolute bottom-0 left-0 right-0 h-[400px]'>
      <Globe
        drag={true}
        topology={Countries as unknown as Topology}
        offset={{ x: 0, y: 400 }}
        scale={2.8}
        width={width}
        height={height}
      />
    </div>
  );
};

export const Mercator = () => {
  const { ref, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>();

  return (
    <div ref={ref} className='flex grow overflow-hidden'>
      <Globe
        drag={true}
        topology={Countries as unknown as Topology}
        styles={globeStyles1}
        projection={d3.geoMercator}
        offset={{ x: 0, y: 80 }}
        rotation={[0, -35, 0]}
        scale={0.7}
        width={width}
        height={height}
      />
    </div>
  );
};

// TODO(burdon): Set waypoints and animate points/trajectory.
// https://observablehq.com/@mbostock/top-100-cities
const routes: Record<string, string[]> = {
  JFK: ['SFO', 'LAX', 'SEA'],
  CDG: ['BHX', 'BCN', 'VIE', 'WAW', 'CPH', 'ATH', 'IST'],
  SIN: ['HND', 'SYD', 'HKG', 'BKK'],
};

// TODO(burdon): Make hierarchical/tree.
const createRoute = () => {
  let previousHub: LatLng;
  return Object.entries(routes).reduce<{ points: LatLng[]; lines: { source: LatLng; target: LatLng }[] }>(
    (features, [hub, regional]) => {
      const hubAirport = Airports.features.find(({ properties }) => properties.iata === hub);
      if (hubAirport) {
        const [lng, lat] = hubAirport.geometry.coordinates;
        const hubPoint = { lat, lng };
        features.points.push(hubPoint);
        if (previousHub) {
          features.lines.push({ source: previousHub, target: hubPoint });
        }

        for (const dest of regional) {
          const destAirport = Airports.features.find(({ properties }) => properties.iata === dest);
          if (destAirport) {
            const [lng, lat] = destAirport.geometry.coordinates;
            features.points.push({ lat, lng });
            features.lines.push({ source: hubPoint, target: { lat, lng } });
          }
        }

        previousHub = hubPoint;
      }

      return features;
    },
    { points: [], lines: [] },
  );
};

export const Globe1 = () => {
  return <Spinner scale={1.2} rotation={[0, -40, 0]} />;
};

export const Globe2 = () => {
  return <Spinner scale={0.5} />;
};

export const Globe3 = () => {
  return <Spinner tour projection={d3.geoOrthographic} scale={0.9} />;
};

export const Globe4 = () => {
  return <Spinner tour projection={d3.geoOrthographic} scale={2} />;
};

const Spinner = ({
  projection = d3.geoMercator,
  rotation: _initialRotation = [0, 0, 0],
  scale = 1,
  tour = false,
}: {
  projection?: () => GeoProjection;
  rotation?: Vector;
  scale?: number;
  tour?: boolean;
}) => {
  const { ref, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>();
  const [rotation, setRotation] = useState<Vector>(_initialRotation);
  const [startSpinner, stopSpinner] = useSpinner((rotation) => setRotation(rotation));
  const controllerRef = useRef<GlobeController>(null);
  const features = useMemo(() => createRoute(), []);

  useEffect(() => {
    if (tour) {
      return;
    }

    startSpinner(rotation, [0.003, 0, 0]);
    const handleFocus = () => startSpinner();
    const handleBlur = () => stopSpinner();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    const off = controllerRef.current.update.on(({ type, projection }) => {
      switch (type) {
        case 'start': {
          stopSpinner();
          break;
        }
        case 'end': {
          startSpinner(projection.rotate());
          break;
        }
      }
    });

    return () => {
      stopSpinner();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      off();
    };
  }, []);

  // TODO(burdon): Factor out into spinner.
  useEffect(() => {
    if (!tour) {
      return;
    }

    const tilt = 0;
    let last: LatLng;
    const t = setTimeout(async () => {
      for (const next of features.points) {
        if (last) {
          // Points.
          const p1 = getPoint(last);
          const p2 = getPoint(next);
          const ip = d3.geoInterpolate(p1, p2);
          const distance = d3.geoDistance(p1, p2);

          // Rotation.
          const r1 = pointToVector(p1, tilt);
          const r2 = pointToVector(p2, tilt);
          const iv = versor.interpolate(r1, r2);

          const { canvas, projection, render } = controllerRef.current;
          const context = canvas.getContext('2d', { alpha: false });
          const path = d3.geoPath(projection, context).pointRadius(2);

          // const start = p1;
          // const end = ip(1);
          // const grad = context.createLinearGradient(0, 0, 400, 400);
          // grad.addColorStop(0, 'yellow');
          // grad.addColorStop(1, 'blue');

          await d3
            .transition()
            .duration(Math.max(1_000, distance * 2_000))
            .tween('render', () => (t) => {
              projection.rotate(iv(t));
              render();

              context.beginPath();
              context.strokeStyle = 'yellow';
              context.lineWidth = 3;
              context.setLineDash([4, 4]);
              path({ type: 'LineString', coordinates: [ip(Math.max(0, Math.min(1, t * 2 - 1))), ip(Math.min(1, t * 2))] });
              context.stroke();

              context.beginPath();
              context.fillStyle = 'red';
              path({ type: 'Point', coordinates: ip(Math.min(1, t * 2)) });
              context.fill();
            })
            // .transition()
            // .duration(1_000)
            // .tween('render', () => (t) => {
            //   render();
            //   context.lineWidth = 3;
            //   context.beginPath();
            //   path({ type: 'LineString', coordinates: [ip(t), p2] });
            //   context.stroke();
            // })
            .end();
        }

        last = next;
      }
    });

    return () => clearTimeout(t);
  }, []);

  return (
    <div ref={ref} className='absolute inset-0'>
      <Globe
        ref={controllerRef}
        drag={true}
        styles={globeStyles2}
        topology={Countries as unknown as Topology}
        features={tour ? { points: features.points } : features}
        rotation={rotation}
        projection={projection}
        scale={scale}
        width={width}
        height={height}
      />
    </div>
  );
};

const getPoint = ({ lat, lng }: LatLng): [number, number] => [lng, lat];
const pointToVector = ([lng, lat]: number[], tilt: number): Vector => [-lng, tilt - lat, 0];
