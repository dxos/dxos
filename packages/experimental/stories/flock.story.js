//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import debug from 'debug';
import React, { useEffect, useRef, useState } from 'react';
import useResizeAware from 'react-resize-aware';
import { withKnobs, number, select } from '@storybook/addon-knobs';

import { FullScreen } from '@dxos/gem-core';

import { Vec2 } from './vec2';

debug.enable('gem:flock:*');

export default {
  title: 'Flock',
  decorators: [withKnobs]
};

// Boids flocking
// https://en.wikipedia.org/wiki/Boids
// https://bl.ocks.org/veltman/995d3a677418100ac43877f3ed1cc728

// TODO(burdon): Move to knobs
let flockmateRadius = 60;
let separationDistance = 30;
let maxVelocity = 2;

let separationForce = 0.03;
let alignmentForce = 0.03;
let cohesionForce = 0.03;

const configForces = {
  separationForce,
  alignmentForce,
  cohesionForce
};

function randomVelocity() {
  return new Vec2(1 - Math.random() * 2, 1 - Math.random() * 2).scale(maxVelocity);
}

function radialVelocity(p) {
  return new Vec2(Math.sin(2 * Math.PI * p), Math.cos(2 * Math.PI * p)).scale(maxVelocity);
}

function initializeRandom({ numBoids }, { width, height }) {
  return d3.range(numBoids).map(function() {
    return {
      position: new Vec2(Math.random() * width, Math.random() * height),
      velocity: randomVelocity()
    };
  });
}

function initializePhyllotaxis({ numBoids }, { width, height }) {
  return d3.range(numBoids).map(function(d, i) {
    let θ = Math.PI * i * (Math.sqrt(5) - 1);
    let r = Math.sqrt(i) * 200 / Math.sqrt(numBoids);

    return {
      position: new Vec2(width / 2 + r * Math.cos(θ),height / 2 - r * Math.sin(θ)),
      velocity: radialVelocity(i / numBoids)
    };
  });
}

function initializeSine({ numBoids }, { width, height }) {
  return d3.range(numBoids).map(function(i) {
    let angle = 2 * Math.PI * i / numBoids;
    let x = width * i / numBoids;
    let y = height / 2 + Math.sin(angle) * height / 4;

    return {
      position: new Vec2(x, y),
      velocity: radialVelocity(i / numBoids)
    };
  });
}

function initializeCircleIn({ numBoids }, { width, height }) {
  return d3.range(numBoids).map(function(i) {
    let angle = i * 2 * Math.PI / numBoids,
      x = 200 * Math.sin(angle),
      y = 200 * Math.cos(angle);

    return {
      position: new Vec2(x + width / 2, y + height / 2),
      velocity: new Vec2(-x, -y).scale(maxVelocity)
    };
  });
}

function initializeCircleRandom({ numBoids }, { width, height }) {
  return d3.range(numBoids).map(function(i) {
    let angle = i * 2 * Math.PI / numBoids;
    let x = 200 * Math.sin(angle);
    let y = 200 * Math.cos(angle);

    return {
      position: new Vec2(x + width / 2, y + height / 2),
      velocity: randomVelocity().scale(maxVelocity)
    };
  });
}

const initializers = {
  initializeRandom,
  initializePhyllotaxis,
  initializeSine,
  initializeCircleIn,
  initializeCircleRandom,
};

function updateBoid(b, context, { width, height }, { coloring }) {
  b.position.add(b.velocity.add(b.acceleration).truncate(maxVelocity));

  if (b.position.y > height) {
    b.position.y -= height;
  } else if (b.position.y < 0) {
    b.position.y += height;
  }

  if (b.position.x > width) {
    b.position.x -= width;
  } else if (b.position.x < 0) {
    b.position.x += width;
  }

  context.beginPath();
  if (coloring === 'Rainbow') {
    context.fillStyle = b.color;
  } else {
    context.fillStyle = d3.interpolateWarm(d3.mean(b.last));
  }
  context.arc(b.position.x, b.position.y, 2, 0, 2 * Math.PI);
  context.fill();
}

function tick(boids, canvas, offscreenCanvas, { width, height }, config) {
  const offscreenContext = offscreenCanvas.getContext('2d');
  offscreenContext.globalAlpha = 0.85;
  offscreenContext.clearRect(0, 0, width, height);
  offscreenContext.drawImage(canvas, 0, 0, width, height);

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);
  context.drawImage(offscreenCanvas, 0, 0, width, height);

  // Update physics.
  boids.forEach(function(b) {
    let forces = {
      alignment: new Vec2(),
      cohesion: new Vec2(),
      separation: new Vec2()
    };

    b.acceleration = new Vec2();

    boids.forEach(function(b2) {
      if (b === b2) return;

      let diff = b2.position.clone().subtract(b.position);
      let distance = diff.length();

      if (distance && distance < separationDistance) {
        forces.separation.add(diff.clone().scaleTo(-1 / distance)).active = true;
      }

      if (distance < flockmateRadius) {
        forces.cohesion.add(diff).active = true;
        forces.alignment.add(b2.velocity).active = true;
      }
    });

    for (let key in forces) {
      if (forces[key].active) {
        forces[key].scaleTo(maxVelocity)
          .subtract(b.velocity)
          .truncate(configForces[key + 'Force']); // TODO(burdon): Remove dep on globals.

        b.acceleration.add(forces[key]);
      }
    }

    const { coloring } = config;
    if (coloring === 'By Movement') {
      b.last.push(b.acceleration.length() / (alignmentForce + cohesionForce + separationForce));
      if (b.last.length > 20) {
        b.last.shift();
      }
    }
  });

  // Update and render boids.
  boids.forEach(boid => updateBoid(boid, context, { width, height }, config));
}

function restart(canvas, offscreenCanvas, { width, height }, config) {
  const offscreenContext = offscreenCanvas.getContext('2d');
  offscreenContext.clearRect(0, 0, width, height);

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);

  const { numBoids, startingPosition } = config;
  const boids = initializers[`initialize${startingPosition}`](config, { width, height });
  boids.forEach(function(b, i) {
    b.color = d3.interpolateRainbow(i / numBoids);
    b.last = [];
  });

  return boids;
}

const map = array => array.reduce((map, value) => { map[value] = value; return map; }, {});

export const withFlock = () => {
  const canvas = useRef();
  const offscreenCanvas = useRef();
  const [resizeListener, { width, height }] = useResizeAware();
  const [boids, setBoids] = useState([]);

  // Knobs.
  const numBoids = number('Boids', 100, { range: true, min: 1, max: 300 });
  const startingPosition = select('Start', map(['Random', 'CircleIn', 'CircleRandom', 'Sine', 'Phyllotaxis']), 'Random');
  const coloring = select('Coloring', map(['By Movement', 'Rainbow']), 'By Movement');

  useEffect(() => {
    if (width && height) {
      setBoids(restart(canvas.current, offscreenCanvas.current, { width, height }, {
        numBoids: numBoids || 1,
        startingPosition,
        coloring
      }));
    }
  }, [canvas, offscreenCanvas, width, height, numBoids, startingPosition, coloring]);

  useEffect(() => {
    const interval = d3.interval(() => {
      tick(boids, canvas.current, offscreenCanvas.current, { width, height }, {
        coloring
      });
    });

    return () => interval.stop();
  }, [boids]);

  return (
    <FullScreen>
      {resizeListener}
      <canvas ref={canvas} width={width} height={height} />
      <canvas ref={offscreenCanvas} width={width} height={height} style={{ display: 'none' }} />
    </FullScreen>
  );
};
