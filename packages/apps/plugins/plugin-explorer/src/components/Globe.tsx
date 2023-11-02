//
// Copyright 2023 DXOS.org
//

import * as Plot from '@observablehq/plot';
import React, { useEffect } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import * as topojson from 'topojson-client';

// @ts-ignore
import world from '../../public/countries-110m.json?json';

export type GlobeProps = {
  objects: any[];
};

export const Globe = ({ objects }: GlobeProps) => {
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector({ refreshRate: 200 });
  const land = topojson.feature(world, world.objects.land);

  useEffect(() => {
    if (!width || !height) {
      return;
    }

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
        Plot.geo(land, { fill: 'green', fillOpacity: 0.3 }),
        Plot.graticule(),
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
  }, [objects, width, height]);

  return <div ref={containerRef} className='grow px-4 py-2' />;
};
