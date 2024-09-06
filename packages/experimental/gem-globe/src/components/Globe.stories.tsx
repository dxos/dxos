//
// Copyright 2018 DXOS.org
//

import '@dxosTheme';

import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import { Globe, type Vector } from './Globe';
// @ts-ignore
import TopologyData from '../../data/110m.json';

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
};

const startingPoint: Vector = [-10, -50, 0];
const drift: Vector = [0.002, 0, 0];

const useSpinner = (callback: (rotation: Vector) => void, delta = drift) => {
  const timer = useRef<any>(null);

  const stop = () => {
    if (timer.current) {
      timer.current.stop();
      timer.current = undefined;
    }
  };

  const start = (initial = [0, 0, 0]) => {
    stop();

    let t = 0;
    let lastRotation = initial;

    timer.current = d3.timer((elapsed) => {
      const dt = elapsed - t;
      t = elapsed;

      const rotation: Vector = [
        lastRotation[0] + delta[0] * dt,
        lastRotation[1] + delta[1] * dt,
        lastRotation[2] + delta[2] * dt,
      ];

      lastRotation = rotation;
      callback(rotation);
    });
  };

  return [start, stop];
};

export const Earth = () => {
  const { ref, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>();

  return (
    <div ref={ref} className='absolute bottom-0 left-0 right-0 h-[400px]'>
      <Globe drag={true} topology={TopologyData} offset={{ x: 0, y: 400 }} scale={2.8} width={width} height={height} />
    </div>
  );
};

export const Mercator = () => {
  const { ref, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>();

  return (
    <div ref={ref} className='flex grow overflow-hidden'>
      <Globe
        drag={true}
        topology={TopologyData}
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
  const canvas = useRef(null);
  const { ref, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>();
  const [rotation, setRotation] = useState<Vector>(startingPoint);
  const [startSpinner, stopSpinner] = useSpinner((rotation) => setRotation(rotation));

  // https://github.com/topojson/world-atlas
  // TODO(burdon): https://github.com/topojson/topojson-simplify?tab=readme-ov-file
  // const [topology, setTopology] = useState<Topology>(TopologyData as unknown as Topology);
  // useEffect(() => {
  //   const topology = topojson.simplify(TopologyData as unknown as Topology, 0.02);
  //   console.log(TopologyData);
  //   console.log(topology);
  // }, []);

  useEffect(() => {
    startSpinner(rotation);

    const handleFocus = () => startSpinner(rotation);
    const handleBlur = () => stopSpinner();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      stopSpinner();

      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return (
    <div ref={ref} className='absolute inset-0'>
      <Globe
        ref={canvas}
        drag={true}
        styles={globeStyles2}
        topology={TopologyData}
        rotation={rotation}
        projection={d3.geoMercator}
        scale={3}
        width={width}
        height={height}
      />
    </div>
  );
};
