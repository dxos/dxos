//
// Copyright 2018 DXOS.org
//

import * as d3 from 'd3';
import React, { useRef } from 'react';
import useResizeObserver from 'use-resize-observer';

import TopologyData from '../data/110m.json';
import { Globe } from '../src';

export default {
  title: 'Globe/mercator'
};

const globeStyles = {
  water: {
    fillStyle: '#FAFAFA'
  },

  land: {
    fillStyle: '#FFF',
    strokeStyle: '#BBB'
  },

  border: {
    strokeStyle: '#E5E5E5'
  },

  graticule: {
    strokeStyle: '#E5E5E5'
  }
};

export const Primary = () => {
  const canvas = useRef(null);
  const { ref: resizeRef, width, height } = useResizeObserver<HTMLDivElement>();

  return (
    <div
      ref={resizeRef}
      style={{
        height: '100vh'
      }}
    >
      <Globe
        ref={canvas}
        drag={true}
        styles={globeStyles}
        topology={TopologyData}
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
