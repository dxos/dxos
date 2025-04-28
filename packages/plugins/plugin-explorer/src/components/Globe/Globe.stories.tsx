//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import * as Plot from '@observablehq/plot';
import { type Meta } from '@storybook/react';
import * as d3 from 'd3';
import React, { useEffect } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import * as topojson from 'topojson-client';

import { ClientRepeater } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Globe } from './Globe';
import CitiesData from '../../../data/cities.js';
import CountriesData from '../../../data/countries-110m.js';

// TODO(burdon): Generate data with geo lat/lng.
// TODO(burdon): How to provide geo service via agent?

const DefaultStory = () => {
  const items = CitiesData.features.map((feature: any) => ({
    lat: feature.geometry.coordinates[0],
    lng: feature.geometry.coordinates[1],
  }));

  return <Globe items={items} />;
};

const ExtendedStory = () => {
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector({ refreshRate: 200 });
  useEffect(() => {
    if (!width || !height) {
      return;
    }

    const land = topojson.feature(CountriesData as any, CountriesData.objects.land as any);
    const items = CitiesData.features.map((feature: any) => ({
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

export const Default = () => <ClientRepeater component={DefaultStory} createSpace />;

export const Extended = () => <ClientRepeater component={ExtendedStory} createSpace />;

const meta: Meta = {
  title: 'plugins/plugin-explorer/Globe',
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;
