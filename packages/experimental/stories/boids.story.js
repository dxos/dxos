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

debug.enable('gem:boids:*');

// Boids flocking
// https://en.wikipedia.org/wiki/Boids
// https://bl.ocks.org/veltman/995d3a677418100ac43877f3ed1cc728

export default {
  title: 'Boids',
  decorators: [withKnobs]
};

// TODO(burdon): Move to knobs

let flockmateRadius = 60;
let separationDistance = 30;

let separationForce = 0.03;
let alignmentForce = 0.03;
let cohesionForce = 0.03;

//
// Utils
//

function randomVelocity({ maxVelocity }) {
  return new Vec2(1 - Math.random() * 2, 1 - Math.random() * 2).scale(maxVelocity);
}

function radialVelocity(p, { maxVelocity }) {
  return new Vec2(Math.sin(2 * Math.PI * p), Math.cos(2 * Math.PI * p)).scale(maxVelocity);
}

function initializeRandom({ num, maxVelocity }, { width, height }) {
  return d3.range(num).map(function() {
    return {
      position: new Vec2(Math.random() * width, Math.random() * height),
      velocity: randomVelocity({ maxVelocity })
    };
  });
}

function initializePhyllotaxis({ num, maxVelocity }, { width, height }) {
  return d3.range(num).map(function(d, i) {
    let θ = Math.PI * i * (Math.sqrt(5) - 1);
    let r = Math.sqrt(i) * 200 / Math.sqrt(num);

    return {
      position: new Vec2(width / 2 + r * Math.cos(θ),height / 2 - r * Math.sin(θ)),
      velocity: radialVelocity(i / num, { maxVelocity })
    };
  });
}

function initializeSine({ num, maxVelocity }, { width, height }) {
  return d3.range(num).map(function(i) {
    let angle = 2 * Math.PI * i / num;
    let x = width * i / num;
    let y = height / 2 + Math.sin(angle) * height / 4;

    return {
      position: new Vec2(x, y),
      velocity: radialVelocity(i / num, { maxVelocity })
    };
  });
}

function initializeCircle({ num, maxVelocity }, { width, height }) {
  return d3.range(num).map(function(i) {
    let angle = i * 2 * Math.PI / num;
    let x = 200 * Math.sin(angle);
    let y = 200 * Math.cos(angle);

    return {
      position: new Vec2(x + width / 2, y + height / 2),
      velocity: new Vec2(-x, -y).scale(maxVelocity)
    };
  });
}

function initializeCircleRandom({ num, maxVelocity }, { width, height }) {
  return d3.range(num).map(function(i) {
    let angle = i * 2 * Math.PI / num;
    let x = 200 * Math.sin(angle);
    let y = 200 * Math.cos(angle);

    return {
      position: new Vec2(x + width / 2, y + height / 2),
      velocity: randomVelocity({ maxVelocity }).scale(maxVelocity)
    };
  });
}

const initializeFunction = {
  initializeRandom,
  initializePhyllotaxis,
  initializeSine,
  initializeCircle,
  initializeCircleRandom
};

const configForces = {
  separationForce,
  alignmentForce,
  cohesionForce
};

const coloringFunction = {
  'Rainbow': b => b.color,
  'Grey': b => d3.interpolateGreys(0.25 + d3.mean(b.last)),
  'Movement': b => d3.interpolateWarm(d3.mean(b.last))
};

function updateBoid(b, context, { width, height }, { radius, coloring, maxVelocity }) {
  b.position.add(b.velocity.add(b.acceleration).truncate(maxVelocity));

  // TODO(burdon): Avoid obstacles/edge.

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
  context.fillStyle = coloringFunction[coloring](b);
  context.arc(b.position.x, b.position.y, radius, 0, 2 * Math.PI);
  context.fill();
}

function tick(boids, canvas, offscreenCanvas, { width, height }, config) {
  const { trail, maxVelocity } = config;

  // Vapor trail.
  const offscreenContext = offscreenCanvas.getContext('2d');
  offscreenContext.globalAlpha = trail;
  offscreenContext.clearRect(0, 0, width, height);
  offscreenContext.drawImage(canvas, 0, 0, width, height);

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);
  context.drawImage(offscreenCanvas, 0, 0, width, height);

  // Update physics.
  boids.forEach(function(b1) {
    let forces = {
      alignment: new Vec2(),
      cohesion: new Vec2(),
      separation: new Vec2()
    };

    b1.acceleration = new Vec2();

    // Flocking.
    boids.forEach(function(b2) {
      if (b1 === b2) return;

      let diff = b2.position.clone().subtract(b1.position);
      let distance = diff.length();

      if (distance && distance < separationDistance) {
        forces.separation.add(diff.clone().scaleTo(-1 / distance)).active = true;
      }

      if (distance < flockmateRadius) {
        forces.cohesion.add(diff).active = true;
        forces.alignment.add(b2.velocity).active = true;
      }
    });

    // Compute forces.
    for (let key in forces) {
      if (forces[key].active) {
        forces[key].scaleTo(maxVelocity)
          .subtract(b1.velocity)
          .truncate(configForces[key + 'Force']);

        b1.acceleration.add(forces[key]);
      }
    }

    const { coloring } = config;
    if (coloring === 'Movement') {
      b1.last.push(b1.acceleration.length() / (alignmentForce + cohesionForce + separationForce));
      if (b1.last.length > 20) {
        b1.last.shift();
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

  const { num, startingPosition } = config;
  const boids = initializeFunction[`initialize${startingPosition}`](config, { width, height });
  boids.forEach(function(b, i) {
    b.color = d3.interpolateRainbow(i / num);
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
  const num = number('Count', 100, { range: true, min: 1, max: 1000 });
  const startingPosition = select('Start', map(['Random', 'Circle', 'CircleRandom', 'Sine', 'Phyllotaxis']), 'Random');
  const coloring = select('Coloring', map(['Movement', 'Grey', 'Rainbow']), 'Movement');
  const radius = number('Size', 2, { range: true, min: 1, max: 20, step: .5 });
  const trail = number('Trail', 10, { range: true, min: 0, max: 20 });
  const maxVelocity = number('Velocity', 2, { range: true, min: 1, max: 5, step: .1 });

  useEffect(() => {
    if (width && height) {
      setBoids(restart(canvas.current, offscreenCanvas.current, { width, height }, {
        num,
        startingPosition,
        maxVelocity
      }));
    }
  }, [canvas, offscreenCanvas, width, height, num, startingPosition]);

  useEffect(() => {
    const interval = d3.interval(() => {
      tick(boids, canvas.current, offscreenCanvas.current, { width, height }, {
        coloring,
        trail: (80 + trail) / 100,
        radius,
        maxVelocity
      });
    });

    return () => interval.stop();
  }, [boids, radius, coloring, trail, maxVelocity]);

  return (
    <FullScreen>
      {resizeListener}
      <canvas ref={canvas} width={width} height={height} />
      <canvas ref={offscreenCanvas} width={width} height={height} style={{ display: 'none' }} />
    </FullScreen>
  );
};
