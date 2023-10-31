//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import * as Plot from '@observablehq/plot';
import type { DecoratorFunction } from '@storybook/csf';
import type { ReactRenderer } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import * as topojson from 'topojson-client';

import { types } from '@braneframe/types';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Factor out.
const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer, any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

const Story = () => {
  const [data, setData] = useState<{ world: any; cities: any }>();
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector({ refreshRate: 200 });
  useEffect(() => {
    setTimeout(async () => {
      const world = await (await fetch('/countries-110m.json')).json();
      const cities = await (await fetch('/cities.json')).json();
      setData({
        world,
        cities,
      });
    });
  }, [width, height]);

  useEffect(() => {
    if (!data || !width || !height) {
      return;
    }

    const land = topojson.feature(data.world, data.world.objects.land);
    const cities = data.cities.features.map((feature: any) => ({
      lat: feature.geometry.coordinates[0],
      lng: feature.geometry.coordinates[1],
    }));

    // https://observablehq.com/plot/features/projections
    // https://observablehq.com/plot/marks/geo
    // https://observablehq.com/@observablehq/plot-earthquake-globe?intent=fork
    const plot = Plot.plot({
      projection: { type: 'orthographic', rotate: [-120, -20] },
      width,
      height,
      marks: [
        Plot.geo(land, { fill: 'currentColor', fillOpacity: 0.3 }),
        Plot.graticule(),
        Plot.sphere(),
        Plot.dot(cities, {
          x: 'lat',
          y: 'lng',
          r: 8,
          stroke: 'red',
          fill: 'red',
          fillOpacity: 0.2,
        }),
      ],
    });

    containerRef.current!.append(plot);
    return () => plot?.remove();
  }, [data, width, height]);

  return <div ref={containerRef} className='grow m-4' />;
};

export default {
  component: Story,
  render: Story,
  decorators: [
    FullscreenDecorator(),
    ClientSpaceDecorator({
      schema: types,
    }),
  ],
};

export const Default = {};
