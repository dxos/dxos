//
// Copyright 2023 DXOS.org
//

import { dot, geo, graticule, plot, sphere } from '@observablehq/plot';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { geoCircle } from 'd3';
import React, { useEffect } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { feature } from 'topojson-client';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import CitiesData from '../../../data/cities.js';
import CountriesData from '../../../data/countries-110m.js';
import { Globe } from './Globe';

// TODO(burdon): Generate data with geo lat/lng.
// TODO(burdon): How to provide geo service via agent?

const items = CitiesData.features.map((feature: any) => ({
  lat: feature.geometry.coordinates[0],
  lng: feature.geometry.coordinates[1],
}));

const DefaultStory = () => <Globe items={items} />;

const ExtendedStory = () => {
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector({ refreshRate: 200 });
  useEffect(() => {
    if (!width || !height) {
      return;
    }

    const land = feature(CountriesData as any, CountriesData.objects.land as any);
    const city = items[0];
    const circle = geoCircle().center([city.lat, city.lng]).radius(16)();

    // https://observablehq.com/plot/marks/geo
    // https://observablehq.com/@observablehq/plot-earthquake-globe?intent=fork
    const drawing = plot({
      // https://observablehq.com/plot/features/projections
      projection: { type: 'orthographic', rotate: [-city.lat + 30, -30] },
      width,
      height,
      style: {
        background: 'transparent',
      },
      marks: [
        sphere({ fill: 'lightblue', fillOpacity: 0.5 }),
        geo(land, { fill: 'green', fillOpacity: 0.3 }),
        graticule(),
        geo(circle, { stroke: 'black', fill: 'darkblue', fillOpacity: 0.1, strokeWidth: 2 }),
        dot(items, {
          x: 'lat',
          y: 'lng',
          r: 6,
          stroke: 'red',
          fill: 'red',
          fillOpacity: 0.2,
        }),
      ],
    });

    containerRef.current!.append(drawing);
    return () => drawing?.remove();
  }, [width, height]);

  return <div ref={containerRef} className='grow p-8' />;
};

const meta = {
  title: 'plugins/plugin-explorer/components/Globe',
  component: Globe,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Globe>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStory,
};

export const Extended: Story = {
  render: ExtendedStory,
};
