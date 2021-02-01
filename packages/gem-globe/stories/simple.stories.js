//
// Copyright 2018 DXOS.org
//

import * as d3 from 'd3';
import React, { useRef, useEffect, useState } from 'react';
import EventEmitter from 'events';
import useResizeAware from 'react-resize-aware';
import { makeStyles } from '@material-ui/core/styles';
import { withKnobs } from '@storybook/addon-knobs';

import TopologyData from '../data/110m.json';

import { Globe } from '../src';

export default {
  title: 'Globe-Simple',
  decorators: [withKnobs]
};

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
    height: 400
  }
}));

const globeStyles = {
  background: {
    fillStyle: '#111'
  },

  land: {
    fillStyle: '#666'
  },
};

const startingPoint = [-126.41086746853892, 40.22010998677698, -35.05062057458603];
const drift = [-0.001, 0.001, 0];

const useSpinner = (callback, delta = drift) => {
  const timer = useRef(null);

  const start = (initial = [0, 0, 0]) => {
    stop();

    let t = 0;
    let lastRotation = initial;

    timer.current = d3.timer(elapsed => {
      const dt = elapsed - t;
      t = elapsed;

      const rotation = [
        lastRotation[0] + (delta[0] * dt),
        lastRotation[1] + (delta[1] * dt),
        lastRotation[2] + (delta[2] * dt)
      ];

      lastRotation = rotation;

      callback(rotation);
    });
  };

  const stop = () => {
    if (timer.current) {
      timer.current.stop();
      timer.current = undefined;
    }
  };

  return [start, stop];
};

export const Primary = () => {
  const canvas = useRef(null);
  const classes = useStyles();
  const [resizeListener, { width, height }] = useResizeAware();

  return (o
    <div className={classes.root}>
      {resizeListener}
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
  );
};

export const Flat = () => {
  const canvas = useRef(null);
  const classes = useStyles();
  const [resizeListener, { width, height }] = useResizeAware();
  const [rotation, setRotation] = useState(startingPoint);
  const [startSpinner, stopSpinner] = useSpinner(rotation => setRotation(rotation));
  const eventEmitter = useRef(new EventEmitter());

  useEffect(() => {
    startSpinner(rotation);

    const handleFocus = () => startSpinner(rotation);
    const handleBlur = () => stopSpinner();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Listen for drag updates (pause animation then restart).
    let timeout;
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
    <div className={classes.root}>
      {resizeListener}
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
  );
};
