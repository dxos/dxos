//
// Copyright 2023 DXOS.org
//

import * as Plot from '@observablehq/plot';
import React, { useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

export type GlobeProps = {
  objects: any[];
};

export const Globe = ({ objects }: GlobeProps) => {
  const [data, setData] = useState<{ world: any; cities: any }>();
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector({ refreshRate: 200 });
  // useEffect(() => {
  //   setTimeout(async () => {
  //     const world = await (await fetch('/countries-110m.json')).json();
  //     setData({
  //       world,
  //     });
  //   });
  // }, [width, height]);

  useEffect(() => {
    if (!width || !height) {
      return;
    }

    // const land = topojson.feature(data.world, data.world.objects.land);
    // const cities = data.cities.features.map((feature: any) => ({
    //   lat: feature.geometry.coordinates[0],
    //   lng: feature.geometry.coordinates[1],
    // }));

    // const city = objects[0];
    // const circle = d3.geoCircle().center([city.lat, city.lng]).radius(16)();

    // https://observablehq.com/plot/marks/geo
    // https://observablehq.com/@observablehq/plot-earthquake-globe?intent=fork
    const plot = Plot.plot({
      // https://observablehq.com/plot/features/projections
      projection: { type: 'orthographic', rotate: [30, -20] },
      // projection: { type: 'equirectangular', rotate: [-140, -30] },
      width,
      height,
      style: {
        background: 'transparent',
      },
      marks: [
        Plot.sphere({ fill: 'lightblue', fillOpacity: 0.5 }),
        // Plot.geo(land, { fill: 'green', fillOpacity: 0.3 }),
        Plot.graticule(),
        // Plot.geo(circle, { stroke: 'black', fill: 'darkblue', fillOpacity: 0.1, strokeWidth: 2 }),
        Plot.dot(objects, {
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
  }, [data, width, height]);

  return <div ref={containerRef} className='grow p-8' />;
};
