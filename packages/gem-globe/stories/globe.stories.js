//
// Copyright 2018 DxOS
//

import * as d3 from 'd3';
import EventEmitter from 'events';
import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';
import useResizeAware from 'react-resize-aware';
import { makeStyles } from '@material-ui/core/styles';
import { withKnobs, button, number, select } from '@storybook/addon-knobs';

import { FullScreen, useObjectMutator } from '@dxos/gem-core';

import CitiesData from '../data/cities.json';
import TopologyData from '../data/110m.json';

import { Globe, Versor } from '../src';

export default {
  title: 'Globe',
  decorators: [withKnobs]
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

  return [ value, update, ref ];
};

/**
 *
 * @param initial
 * @param duration
 * @returns {[function, function, function, function, function]}
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
 *
 * @param initial
 * @param duration
 * @returns {[function, function, function, function, function]}
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
 *
 * @param callback
 * @param delta
 * @return {[function, function]}
 */
const useSpinner = (callback, delta = [.002, 0, 0]) => {
  const timer = useRef(null);

  const start = (initial) => {
    stop();

    let t = 0;
    let lastRotation = initial;

    console.log('starting spinner...');
    timer.current = d3.timer(elapsed => {
      const dt = elapsed - t;

      const rotation = [
        lastRotation[0] + (delta[0] * dt),
        lastRotation[1] + (delta[1] * dt),
        lastRotation[2] + (delta[2] * dt),
      ];

      lastRotation = rotation;
      t = elapsed;

      callback(rotation);
    });
  };

  const stop = () => {
    if (timer.current) {
      console.log('stopping spinner...');
      timer.current.stop();
      timer.current = undefined;
    }
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
  default: null,

  blue: {
    background: {
      fillStyle: '#111'
    },

    water: {
      fillStyle: '#123E6A'
    },

    land: {
      fillStyle: '#032153'
    },
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
    },
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
      strokeWidth: 1,
    },

    line: {
      strokeStyle: 'darkred',
      strokeWidth: 1,
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
      strokeWidth: 1,
    },

    point: {
      fillStyle: '#CCC',
      strokeStyle: '#FFF',
      strokeWidth: 1,
      radius: 1
    }
  },
};

const useStyles = makeStyles(() => ({
  label: {
    position: 'absolute',
    padding: 8,
    margin: 0,
    color: 'darkgreen',
    fontFamily: 'monospace',
    fontSize: 14
  }
}));

const locations = {
  LONDON: {
    lat: 51.5074, lng: 0.1278
  }
};

export const withGlobe = () => {
  const canvas = useRef(null);
  const classes = useStyles();
  const [features,, featuresRef, updateFeatures] = useObjectMutator({ points: [], lines: [] });
  const [info, setInfo] = useState(null);
  const [resizeListener, { width, height }] = useResizeAware();

  const styles = select('style', globeStyles);
  const tilt = number('tilt', 25, { min: -45, max: 45 });
  useEffect(() => {
    stopSpinner();
    stopAnimation();
  }, [tilt]);

  const [scale,,, zoom, stopScaler] = useScaler(.9, 500);
  const [rotation, setRotation, rotationRef, rotate, stopRotator] =
    useRotator(Versor.coordinatesToAngles(locations.LONDON, tilt));
  const [startSpinner, stopSpinner] = useSpinner(rotation => setRotation(rotation));

  // Projection updates.
  const projectionType = select('projection', projectionValues, 0);
  const [projection, setProjection] = useState(() => projections[projectionType]);
  useEffect(() => {
    setProjection(() => projections[projectionType]);
  }, [projectionType]);

  button('spin', () => {
    stopAnimation();
    startSpinner(rotationRef.current);
  });
  button('animate', () => {
    stopSpinner();
    startAnimation();
  });
  button('stop', () => {
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

  // Generate features.
  const animationInterval = useRef(null);
  const startAnimation = () => {
    stopAnimation();

    console.log('starting animation...');
    animationInterval.current = d3.interval(() => {

      // Add point.
      // TODO(burdon): Select near-by point going east.
      const { properties: { name }, geometry: { coordinates } } = faker.random.arrayElement(CitiesData.features);
      const point = { lat: coordinates[1], lng: coordinates[0] };

      // Add feature.
      // TODO(burdon): Pulse points.
      const maxLines = 2;
      const { lines, points } = featuresRef();
      updateFeatures(Object.assign({},
        {
          // TODO(burdon): Remove points (not part of current paths).
          points: {
            $push: [ point ]
          }
        },
        points.length && {
          lines: {
            $splice: [ [ 0, Math.max(0, 1 + lines.length - maxLines) ] ],
            $push: [ {
              source: points[points.length - 1],
              target: point
            } ]
          }
        }
      ));

      rotate(canvas.current, Versor.coordinatesToAngles(point, tilt), () => {
        setInfo({
          name,
          coordinates: { lat: coordinates[1], lng: coordinates[0] }
        });
      });

      zoom(canvas.current, Math.random() + .5);
    }, 3000);
  };

  const stopAnimation = () => {
    if (animationInterval.current) {
      console.log('stopping animation...');
      animationInterval.current.stop();
      animationInterval.current = undefined;
    }
  };

  return (
    <FullScreen>
      {resizeListener}

      {info && (
        <pre className={classes.label}>{JSON.stringify(info, null, 2)}</pre>
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
        offset={{ x: 0, y: 0 }}     // TODO(burdon): Function that gets bounds (like d3 d => {}).
        width={width}
        height={height}
      />
    </FullScreen>
  );
};
