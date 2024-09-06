//
// Copyright 2018 DXOS.org
//

import '@dxosTheme';

import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { type Topology } from 'topojson-specification';

import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import { Globe, type GlobeController, type Vector } from './Globe';
import { useSpinner } from '../hooks';
import { type LatLng } from '../util';

// @ts-ignore
import CountriesData from '#data_countries_110m.json';

// https://github.com/topojson/world-atlas

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
        topology={CountriesData as unknown as Topology}
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
        topology={CountriesData as unknown as Topology}
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

export const Spinner = () => {
  const { ref, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>();
  const [rotation, setRotation] = useState<Vector>([-10, -50, 0]);
  const [startSpinner, stopSpinner] = useSpinner((rotation) => setRotation(rotation));
  const controllerRef = useRef<GlobeController>(null);

  // TODO(burdon): Set waypoints and animate points/trajectory.
  // https://observablehq.com/@mbostock/top-100-cities
  const features = useMemo(() => {
    const points: LatLng[] = [
      {
        lat: 51.50853,
        lng: -0.12574,
      },
      {
        lat: 37.98381,
        lng: 23.727539,
      },
      {
        lat: 40.7127753,
        lng: -74.0059728,
      },
      {
        lat: 37.7749,
        lng: -122.4194,
      },
      {
        lat: 35.6895,
        lng: 139.6917,
      },
    ];
    const lines = [
      {
        source: points[0],
        target: points[1],
      },
      {
        source: points[0],
        target: points[2],
      },
      {
        source: points[0],
        target: points[3],
      },
      {
        source: points[0],
        target: points[4],
      },
    ];

    return { points, lines };
  }, []);

  useEffect(() => {
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

  return (
    <div ref={ref} className='absolute inset-0'>
      <Globe
        ref={controllerRef}
        drag={true}
        styles={globeStyles2}
        topology={CountriesData as unknown as Topology}
        features={features}
        rotation={rotation}
        projection={d3.geoMercator}
        scale={1}
        width={width}
        height={height}
      />
    </div>
  );
};
