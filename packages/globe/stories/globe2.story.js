//
// Copyright 2018 DxOS
//

import * as d3 from 'd3';
import EventEmitter from 'events';
import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { withKnobs, button, number, select } from "@storybook/addon-knobs";

import { FullScreen, useObjectMutator } from '@dxos/gem-core';

import CitiesData from '../data/cities.json';
import TopologyData from '../data/110m.json';

import { Globe2, Versor } from '../src';

export default {
  title: 'Globe2',
  decorators: [withKnobs]
};

// TODO(burdon): Deprecate Globe2.
// TODO(burdon): Spinner (same state as rotator, drag).
// TODO(burdon): Blur/shadow.
// TODO(burdon): Offset (top/bottom/left/right).

// Advanced
// TODO(burdon): Factor out generator, etc.
// TODO(burdon): Test performance (e.g., internal tween vs external).
// TODO(burdon): Searchbox.
// TODO(burdon): Topology and geodata abstractions (different sets).
// TODO(burdon): Zoom from detailed local (city/openstreetmaps?) dataset to earth.
// TODO(burdon): Combine with spore animation story.
// TODO(burdon): Animated arcs.

/**
 *
 * @param initial
 * @returns {[]}
 */
// TODO(burdon): Factor out.
const useStateWithRef = (initial) => {
  const [value, setValue] = useState(typeof initial === 'function' ? initial() : initial);
  const ref = useRef(value);

  return [
    value,
    value => { setValue(value); ref.current = value; },
    ref
  ];
};

/**
 *
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
 *
 * @param initial
 * @param duration
 * @returns {[]}
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
 */
const useSpinner = (callback, delta = [.00002, 0, 0]) => {
  let timer;

  const start = (initial) => {
    let t = 0;
    let lastRotation = initial;
    timer = d3.timer(elapsed => {
      const dt = elapsed - t;

      const rotation = [
        lastRotation[0] + (delta[0] * dt),
        lastRotation[1] + (delta[1] * dt),
        lastRotation[2] + (delta[2] * dt),
      ];

      lastRotation = rotation;

      callback(rotation);
    });
  };

  const stop = () => {
    timer.stop();
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

export const withSimpleGlobe = () => {
  const canvas = useRef();
  const classes = useStyles();
  const [features,, featuresRef, updateFeatures] = useObjectMutator({ points: [], lines: [] });
  const [scale,,, zoom, stopScaler] = useScaler(.9, 500);
  const [rotation, setRotation,, rotate, stopRotator] = useRotator(Versor.coordinatesToAngles({ lat: 51.5074, lng: 0.1278 }, tilt));
  const [startSpinner, stopSpinner] = useSpinner(rotation => {
    setRotation(rotation);
  });

  const [info, setInfo] = useState(null);

  const tilt = number('tilt', 25, { min: -45, max: 45 });
  const styles = select('style', globeStyles);

  // TODO(burdon): Can't spin and rotate at same time (need shared state).
  button('spin', () => {
    stopRotator(canvas.current);
    startSpinner(rotation);
  });

  // Projection updates.
  const projectionType = select('Projection', projectionValues, 0);
  const [projection, setProjection] = useState(() => projections[projectionType]);
  useEffect(() => {
    setProjection(() => projections[projectionType]);
  }, [projectionType]);

  // Listen for drag updates.
  // TODO(burdon): Change to state object (tracks current state).
  const eventEmitter = useRef(new EventEmitter());
  useEffect(() => {
    eventEmitter.current.on('update', ({ rotation }) => {
      stopSpinner();
      stopRotator(canvas.current, rotation);
      stopScaler(canvas.current);
    });
  }, []);

  // Clean-up.
  useEffect(() => {
    return () => {
      stopSpinner();
    };
  }, []);

  // TODO(burdon): Factor out feature generation.
  // Generate features.
  useEffect(() => {
    const interval = d3.interval(() => {

      // Zoom scale.
      zoom(canvas.current, Math.random() + .5);

      // Add point.
      // TODO(burdon): Select near-by point going east.
      const { properties: { name }, geometry: { coordinates} } = faker.random.arrayElement(CitiesData.features);
      const point = { lat: coordinates[1], lng: coordinates[0] };

      // Add feature.
      // TODO(burdon): Pulse points.
      const maxLines = 2;
      const { lines, points } = featuresRef();
      updateFeatures(Object.assign({},
        {
          // TODO(burdon): Remove points (not part of current paths).
          points: {
            $push: [point]
          }
        },
        points.length && {
          lines: {
            $splice: [[0, Math.max(0, 1 + lines.length - maxLines)]],
            $push: [{
              source: points[points.length - 1],
              target: point
            }]
          }
        }
      ));

      rotate(canvas.current, Versor.coordinatesToAngles(point, tilt), () => {
        setInfo({
          name,
          coordinates: { lat: coordinates[1], lng: coordinates[0] }
        });
      });
    }, 3000);

    return () => {
      // Cancel intervals and transitions.
      interval.stop();

      // NOTE: Explicitely cancel all transitions (BUG: https://github.com/d3/d3-transition/issues/9).
      stopScaler(canvas.current);
      stopRotator(canvas.current);
    };
  }, []);

  /*
  // TODO(burdon): Spinner.
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
  */

  return (
    <FullScreen>
      {info && (
        <pre className={classes.label}>{JSON.stringify(info, null, 2)}</pre>
      )}

      <Globe2
        ref={canvas}
        drag={true}
        events={eventEmitter.current}
        styles={styles}
        projection={projection}
        topology={TopologyData}
        features={features}
        scale={scale}
        rotation={rotation}
        offset={{ x: 0, y: 0 }}     // TODO(burdon): Function that gets bounds.
      />
    </FullScreen>
  );
};
