//
// Copyright 2018 DXOS.org
//

import { withTheme } from '@dxos/storybook-utils';
import * as d3 from 'd3';
import EventEmitter from 'events';
import React, { type ReactNode, useRef, useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

// @ts-ignore
import TopologyData from '../data/110m.json';
import { Globe, type Vector } from '../src';

export default {
  title: 'gem-globe/Globe',
  decorators: [withTheme],
};

const globeStyles = {
  background: {
    fillStyle: '#111',
  },

  land: {
    fillStyle: '#666',
  },
};

const startingPoint: Vector = [-126.41086746853892, 40.22010998677698, -35.05062057458603];
const drift: Vector = [-0.001, 0.001, 0];

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

const Container = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column-reverse',
      backgroundColor: '#111',
    }}
  >
    {children}
  </div>
);

export const Primary = () => {
  const canvas = useRef(null);
  const { ref: resizeRef, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>();

  return (
    <Container>
      <div style={{ display: 'flex', width: '100%', height: 400 }} ref={resizeRef}>
        <Globe
          ref={canvas}
          drag={true}
          topology={TopologyData}
          offset={{ x: 0, y: 200 }}
          scale={1.8}
          width={width}
          height={height}
        />
      </div>
    </Container>
  );
};

export const Secondary = () => {
  const canvas = useRef(null);
  const { ref: resizeRef, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>();
  const [rotation, setRotation] = useState<Vector>(startingPoint);
  const [startSpinner, stopSpinner] = useSpinner((rotation) => setRotation(rotation));
  const eventEmitter = useRef(new EventEmitter());

  useEffect(() => {
    startSpinner(rotation);

    const handleFocus = () => startSpinner(rotation);
    const handleBlur = () => stopSpinner();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Listen for drag updates (pause animation then restart).
    let timeout: any;
    eventEmitter.current.on('update', ({ rotation }) => {
      stopSpinner();
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        startSpinner(rotation);
      }, 500);
    });

    return () => {
      stopSpinner();
      clearTimeout(timeout);

      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return (
    <Container>
      <div style={{ display: 'flex', width: '100%', height: 400 }} ref={resizeRef}>
        <Globe
          ref={canvas}
          events={eventEmitter.current}
          drag={true}
          styles={globeStyles}
          topology={TopologyData}
          rotation={rotation}
          projection={d3.geoMercator}
          scale={1.8}
          width={width}
          height={height}
        />
      </div>
    </Container>
  );
};
