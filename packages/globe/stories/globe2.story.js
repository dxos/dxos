//
// Copyright 2018 DxOS
//

import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';

import { FullScreen } from '@dxos/gem-core';

import TopologyData from '../data/110m.json';

import { Globe2, Versor } from '../src';

export default {
  title: 'Globe2'
};

export const withSimpleGlobe = () => {
  const [scale, setScale] = useState(.9);
  const [rotation, setRotation] = useState(() => Versor.coordinatesToAngles({ lat: 40.639751, lng: -73.778925 }));

  // TODO(burdon): Test rotation transition performance (vs inside).
  const scaleRef = useRef(.9);
  const rotationRef = useRef(rotation);
  useEffect(() => {
    const interval = d3.interval(() => {
      scaleRef.current += .0005;
      setScale(scaleRef.current);

      const r = [...rotationRef.current];
      r[0] += 1;
      rotationRef.current = r;
      setRotation(rotationRef.current);

      if (scaleRef.current > 1) {
        interval.stop();
      }
    }, 1);

    return () => interval.stop();
  }, []);

  return (
    <FullScreen>
      <Globe2
        topology={TopologyData}
        scale={scale}
        rotation={rotation}
        drag={true}
      />
    </FullScreen>
  );
};
