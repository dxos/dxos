//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useRef } from 'react';

import { Globe, type GlobeController } from '@dxos/gem-globe';

import { type MapControlProps } from './MapControl';

const globeStyles = {
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

export const GlobeControl = ({ classNames, markers = [] }: MapControlProps) => {
  const ref = useRef<GlobeController>(null);
  const features = useMemo(
    () => ({
      points: markers?.map(({ location: { lat, lng } }) => ({ lat, lng })),
      lines: [],
    }),
    [markers],
  );

  return (
    <Globe.Root>
      <Globe.Canvas
        ref={ref}
        classNames={classNames}
        styles={globeStyles}
        projection='mercator'
        features={features}
        scale={2}
        drag
      />
      <Globe.Controls onAction={() => ref.current?.center()} />
    </Globe.Root>
  );
};
