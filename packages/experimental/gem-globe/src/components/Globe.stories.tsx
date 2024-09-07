//
// Copyright 2018 DXOS.org
//

import '@dxos-theme';

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

// TODO(burdon): Globe plugin (add component to Map plugin).
// TODO(burdon): Add charts to sheet.
// TODO(burdon): Able to script (e.g., list of cities).
// TODO(burdon): Search flight information. Calendar (itinerary).

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
    strokeStyle: 'darkred',
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

export const Tour1 = () => {
  return <Spinner rotation={[-20, -50, 0]} scale={2} />;
};

export const Tour2 = () => {
  return <Spinner scale={0.5} />;
};

const Spinner = ({ rotation: _initialRotation = [0, 0, 0], scale = 1 }: { rotation?: Vector; scale?: number }) => {
  const { ref, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>();
  const [rotation, setRotation] = useState<Vector>(_initialRotation);
  const [startSpinner, stopSpinner] = useSpinner((rotation) => setRotation(rotation));
  const controllerRef = useRef<GlobeController>(null);
  const features = useMemo(() => createRoute(), []);

  const spin = false;
  useEffect(() => {
    if (!spin) {
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

  // TODO(burdon): Factor out hook.
  useEffect(() => {
    const tilt = 10;

    const getPoint = ({ lat, lng }: LatLng): [number, number] => [lng, lat];
    const getTilt = ([lng, lat]: number[]): Vector => [-lng, tilt - lat, 0];

    let last: LatLng;
    const t = setTimeout(async () => {
      // TODO(burdon): Generator.
      for (const city of features.points) {
        if (last) {
          const p1 = getPoint(last);
          const p2 = getPoint(city);

          const r1 = getTilt(getPoint(last));
          const r2 = getTilt(getPoint(city));

          const ip = d3.geoInterpolate(p1, p2);
          const iv = versor.interpolate(r1, r2);

          const { canvas, projection, render } = controllerRef.current;
          const context = canvas.getContext('2d', { alpha: false });
          const path = d3.geoPath(projection, context).pointRadius(1.5);

          await d3
            .transition()
            .duration(1250)
            .tween('render', () => (t) => {
              projection.rotate(iv(t));
              render();
              context.beginPath();
              path({ type: 'LineString', coordinates: [p1 || p2, ip(t)] });
              context.stroke();
            })
            .transition()
            .tween('render', () => (t) => {
              render();
              context.beginPath();
              path({ type: 'LineString', coordinates: [ip(t), p2] });
              context.stroke();
            })
            .end();
        }

        last = city;
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
        features={{ points: features.points }}
        rotation={rotation}
        projection={d3.geoMercator}
        scale={scale}
        width={width}
        height={height}
      />
    </div>
  );
};
