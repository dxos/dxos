//
// Copyright 2018 DXOS.org
//

import * as d3 from 'd3';
import debug from 'debug';
import EventEmitter from 'events';
import faker from 'faker';
import update from 'immutability-helper';
import React, { useEffect, useRef, useState } from 'react';
import useResizeObserver from 'use-resize-observer';

import { Knobs, KnobsProvider, useButton, useNumber, useSelect } from '@dxos/esbuild-book-knobs';
import { FullScreen, useStateRef } from '@dxos/gem-core';

import TopologyData from '../data/110m.json';
import CitiesData from '../data/cities.json';
import { Globe, Versor } from '../src';

const log = debug('dxos:gem-spore:globe');

export default {
  title: 'Globe/custom'
};

// TODO(burdon): Deprecate Globe2.
// TODO(burdon): Blur/shadow.

// Advanced
// TODO(burdon): Factor out generator, etc.
// TODO(burdon): Offset (top/bottom/left/right).
// TODO(burdon): Spinner (same state as rotator, drag).
// TODO(burdon): Pinch zoom.
// TODO(burdon): Test performance (e.g., internal tween vs external).
// TODO(burdon): Searchbox.
// TODO(burdon): Topology and geodata abstractions (different sets).
// TODO(burdon): Zoom from detailed local (city/openstreetmaps?) dataset to earth.
// TODO(burdon): Combine with spore animation story.
// TODO(burdon): Animated arcs.

/**
 *
 * @param initial
 * @returns {[function, function, function]}
 */
// TODO(burdon): Factor out to core.
const useStateWithRef = (initial) => {
  const [value, setValue] = useState(typeof initial === 'function' ? initial() : initial);
  const ref = useRef(value);
  const update = value => {
    setValue(value);
    ref.current = value;
  };

  return [value, update, ref];
};

/**
 * @param initial
 * @param duration
 */
const useScaler = (initial, duration = 1000) => {
  const [scale, setScale, scaleRef] = useStateWithRef(initial);

  const zoom = (canvas, scale, callback, t) => {
    const oldScale = scaleRef.current;

    // https://github.com/d3/d3-transition#selection_transition
    d3.select(canvas)
      .interrupt('globe-scale')
      .transition('globe-scale')
      .duration(t || duration)
      .tween('globe-scale-tween', () => t => {
        setScale(oldScale + (scale - oldScale) * t);
        if (callback && t === 1) {
          callback();
        }
      });
  };

  const stop = (canvas) => d3.select(canvas).interrupt('globe-scale').transition();

  return [scale, setScale, scaleRef, zoom, stop];
};

/**
 * @param initial
 * @param duration
 */
const useRotator = (initial, duration = 1000) => {
  const [rotation, setRotation, rotationRef] = useStateWithRef(initial);

  const rotate = (canvas, rotation, callback, t) => {
    const interpolateRotation = Versor.interpolateAngles(rotationRef.current, rotation);

    // https://github.com/d3/d3-transition#selection_transition
    d3.select(canvas)
      .interrupt('globe-rotate')
      .transition('globe-rotate')
      .duration(t || duration)
      .tween('globe-rotate-tween', () => t => {
        setRotation(interpolateRotation(t));
        if (callback && t === 1) {
          callback();
        }
      });
  };

  const stop = (canvas, rotation) => {
    d3.select(canvas).interrupt('globe-rotate').transition();
    if (rotation) {
      rotationRef.current = rotation;
    }
  };

  return [rotation, setRotation, rotationRef, rotate, stop];
};

/**
 * @param callback
 * @param [delta]
 * @return {[function, function]}
 */
const useSpinner = (callback, delta = [0.002, 0, 0]): [
  (initial) => void,
  () => void
] => {
  const timer = useRef(null);

  const stop = () => {
    if (timer.current) {
      log('stopping spinner...');
      timer.current.stop();
      timer.current = undefined;
    }
  };

  const start = (initial) => {
    stop();

    let t = 0;
    let lastRotation = initial;

    log('starting spinner...');
    timer.current = d3.timer(elapsed => {
      const dt = elapsed - t;

      const rotation = [
        lastRotation[0] + (delta[0] * dt),
        lastRotation[1] + (delta[1] * dt),
        lastRotation[2] + (delta[2] * dt)
      ];

      lastRotation = rotation;
      t = elapsed;

      callback(rotation);
    });
  };

  return [start, stop];
};

const projections = [
  d3.geoOrthographic,
  d3.geoMercator
];

const projectionValues = {
  'Orthographic': 0,
  'Mercator': 1
};

// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute
const globeStyles = {
  blue: {
    background: {
      fillStyle: '#111'
    },

    water: {
      fillStyle: '#123E6A'
    },

    land: {
      fillStyle: '#032153'
    }
  },

  green: {
    background: {
      fillStyle: '#111'
    },

    water: {
      fillStyle: '#13293E'
    },

    land: {
      fillStyle: '#2A554D'
    }
  },

  light: {
    background: {
      fillStyle: '#333'
    },

    water: {
      fillStyle: '#F5F5F5'
    },

    land: {
      fillStyle: '#FFF',
      strokeStyle: '#BBB',
      strokeWidth: 1
    },

    border: {
      strokeStyle: '#EEE',
      strokeWidth: 1
    },

    graticule: {
      strokeStyle: '#CCC',
      strokeWidth: 1
    },

    line: {
      strokeStyle: 'darkred',
      strokeWidth: 1
    },

    point: {
      fillStyle: 'orange',
      strokeStyle: 'darkred',
      strokeWidth: 1,
      radius: 1
    }
  },

  dark: {
    background: {
      fillStyle: '#000'
    },

    water: {
      fillStyle: '#111'
    },

    land: {
      fillStyle: '#222'
    },

    line: {
      strokeStyle: '#FFF',
      strokeWidth: 1
    },

    point: {
      fillStyle: '#CCC',
      strokeStyle: '#FFF',
      strokeWidth: 1,
      radius: 1
    }
  }
};

const locations = {
  LONDON: {
    lat: 51.5074, lng: 0.1278
  }
};

const Story = () => {
  const canvas = useRef(null);
  const [features, setFeatures, featuresRef] = useStateRef<{ points?: [], lines?: [] }>({ points: [], lines: [] });
  const [info, setInfo] = useState(null);
  const { ref: resizeRef, width, height } = useResizeObserver<HTMLDivElement>();

  const styles = useSelect('style', globeStyles);
  const tilt = useNumber('tilt', { min: -45, max: 45, step: 5 }, 25);

  const [scale,,, zoom, stopScaler] = useScaler(0.9, 500);
  const [rotation, setRotation, rotationRef, rotate, stopRotator] =
    useRotator(Versor.coordinatesToAngles(locations.LONDON, tilt));
  const [startSpinner, stopSpinner] = useSpinner(rotation => setRotation(rotation));

  // Generate features.
  const animationInterval = useRef(null);

  const stopAnimation = () => {
    if (animationInterval.current) {
      log('stopping animation...');
      animationInterval.current.stop();
      animationInterval.current = undefined;
    }
  };

  const startAnimation = () => {
    stopAnimation();

    log('starting animation...');
    animationInterval.current = d3.interval(() => {
      // Add point.
      // TODO(burdon): Select near-by point going east.
      const { properties: { name }, geometry: { coordinates } } = faker.random.arrayElement(CitiesData.features);
      const point = { lat: coordinates[1], lng: coordinates[0] };

      // Add feature.
      // TODO(burdon): Pulse points.
      const maxLines = 2;
      const { lines, points } = featuresRef.current;

      // TODO(burdon): Remove points (not part of current paths).
      const updateSpec = Object.assign({
        points: {
          '$push': [point]
        }
      }, points.length && {
        lines: {
          $splice: [[0, Math.max(0, 1 + lines.length - maxLines)]],
          $push: [{
            source: points[points.length - 1],
            target: point
          }]
        }
      });

      setFeatures(update<any>(featuresRef.current, updateSpec as any));

      rotate(canvas.current, Versor.coordinatesToAngles(point, tilt), () => {
        setInfo({
          name,
          coordinates: { lat: coordinates[1], lng: coordinates[0] }
        });
      });

      zoom(canvas.current, Math.random() + 0.5);
    }, 3000);
  };

  useEffect(() => {
    stopSpinner();
    stopAnimation();
  }, [tilt]);

  // Projection updates.
  const projectionType = useSelect('projection', projectionValues);
  const [projection, setProjection] = useState(() => projections[projectionType]);
  useEffect(() => {
    setProjection(() => projections[projectionType]);
  }, [projectionType]);

  // Actions.
  useButton('spin', () => {
    stopAnimation();
    startSpinner(rotationRef.current);
  });
  useButton('animate', () => {
    stopSpinner();
    startAnimation();
  });
  useButton('stop', () => {
    stopSpinner();
    stopAnimation();
  });

  useEffect(() => {
    // Clean-up on unmount.
    return () => {
      stopSpinner();
      stopAnimation();

      // Cancel intervals and transitions.
      // NOTE: Explicitely cancel all transitions (BUG: https://github.com/d3/d3-transition/issues/9).
      stopScaler(canvas.current);
      stopRotator(canvas.current);
    };
  }, []);

  // Listen for drag updates.
  // TODO(burdon): Cannot tilt, spin rotate at same time (need shared state).
  const eventEmitter = useRef(new EventEmitter());
  useEffect(() => {
    eventEmitter.current.on('update', ({ rotation }) => {
      stopSpinner();
      stopAnimation();

      stopRotator(canvas.current, rotation);
      stopScaler(canvas.current);
    });
  }, []);

  return (
    <div
      ref={resizeRef}
      style={{
        display: 'flex',
        flex: 1
      }}
    >
      {info && (
        <pre style={{
          position: 'absolute',
          padding: 8,
          margin: 0,
          color: 'darkgreen',
          fontFamily: 'monospace',
          fontSize: 14
        }}>
          {JSON.stringify(info, null, 2)}
        </pre>
      )}

      <Globe
        ref={canvas}
        drag={true}
        events={eventEmitter.current}
        styles={styles}
        projection={projection}
        topology={TopologyData}
        features={features}
        scale={scale}
        rotation={rotation}
        offset={{ x: 0, y: 0 }} // TODO(burdon): Function that gets bounds (like d3 d => {}).
        width={width}
        height={height}
      />
    </div>
  );
};

export const Primary = () => {
  return (
    <FullScreen>
      <KnobsProvider>
        <Story />
        <Knobs floating='top-right' />
      </KnobsProvider>
    </FullScreen>
  );
};
