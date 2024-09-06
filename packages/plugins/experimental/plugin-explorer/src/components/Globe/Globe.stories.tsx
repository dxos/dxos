//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import * as Plot from '@observablehq/plot';
import * as d3 from 'd3';
import React, { useEffect } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import * as topojson from 'topojson-client';

import { ClientRepeater } from '@dxos/react-client/testing';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { Globe } from './Globe';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cities = require('../../../data/cities.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const world = require('../../../data/countries-110m.json');

// TODO(burdon): Generate data with geo lat/lng.
// TODO(burdon): How to provide geo service via agent?

export default {
  title: 'plugin-explorer/Globe',
  component: Plot,
  decorators: [withTheme, withFullscreen()],
};

export const Default = () => <ClientRepeater component={DefaultStory} createSpace />;

const DefaultStory = () => {
  const items = cities.features.map((feature: any) => ({
    lat: feature.geometry.coordinates[0],
    lng: feature.geometry.coordinates[1],
  }));

  return <Globe items={items} />;
};

export const Extended = () => <ClientRepeater component={ExtendedStory} createSpace />;
const ExtendedStory = () => {
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector({ refreshRate: 200 });
  useEffect(() => {
    if (!width || !height) {
      return;
    }

    const land = topojson.feature(world as any, world.objects.land as any);
    const items = cities.features.map((feature: any) => ({
      lat: feature.geometry.coordinates[0],
      lng: feature.geometry.coordinates[1],
    }));

    const city = items[0];
    const circle = d3.geoCircle().center([city.lat, city.lng]).radius(16)();

    // https://observablehq.com/plot/marks/geo
    // https://observablehq.com/@observablehq/plot-earthquake-globe?intent=fork
    const plot = Plot.plot({
      // https://observablehq.com/plot/features/projections
      projection: { type: 'orthographic', rotate: [-city.lat + 30, -30] },
      // projection: { type: 'equirectangular', rotate: [-140, -30] },
      width,
      height,
      style: {
        background: 'transparent',
      },
      marks: [
        Plot.sphere({ fill: 'lightblue', fillOpacity: 0.5 }),
        Plot.geo(land, { fill: 'green', fillOpacity: 0.3 }),
        Plot.graticule(),
        Plot.geo(circle, { stroke: 'black', fill: 'darkblue', fillOpacity: 0.1, strokeWidth: 2 }),
        Plot.dot(items, {
          x: 'lat',
          y: 'lng',
          r: 6,
          stroke: 'red',
          fill: 'red',
          fillOpacity: 0.2,
        }),
      ],
    });

    containerRef.current!.append(plot);
    return () => plot?.remove();
  }, [width, height]);

  return <div ref={containerRef} className='grow p-8' />;
};
