//
// Copyright 2020 DXOS.org
//

import { css } from '@emotion/css';
import * as d3 from 'd3';
import debug from 'debug';
import React, { useEffect, useRef, useState } from 'react';
import useResizeAware from 'react-resize-aware';

import { Knobs, KnobsProvider, useNumber, useSelect } from '@dxos/esbuild-book-knobs';
import { FullScreen } from '@dxos/gem-core';

import { Vec2 } from './util/vec2';

debug.enable('gem:boids:*');

// Boids flocking
// https://en.wikipedia.org/wiki/Boids
// https://bl.ocks.org/veltman/995d3a677418100ac43877f3ed1cc728

export default {
  title: 'experimental/boids'
};

const styles = {
  knobs: css`
    position: absolute;
    display: flex;
    flex-direction: column;
    bottom: 0;
    background-color: white;
    padding: 4px;
    > div {
      display: flex;
    }
    label {
      width: 120px;
    }
    select {
      width: 120px;
      outline: none;
    }
  `
};

const flockmateRadius = 60;
const separationDistance = 30;

//
// Utils
//

const randomVelocity = ({ maxVelocity }) => new Vec2(1 - Math.random() * 2, 1 - Math.random() * 2).scale(maxVelocity);

const radialVelocity = (p, { maxVelocity }) => new Vec2(Math.sin(2 * Math.PI * p), Math.cos(2 * Math.PI * p)).scale(maxVelocity);

const initializeRandom = ({ num, maxVelocity }, { width, height }) => d3.range(num).map(() => {
  return {
    position: new Vec2(Math.random() * width, Math.random() * height),
    velocity: randomVelocity({ maxVelocity })
  };
});

const initializePhyllotaxis = ({ num, maxVelocity }, { width, height }) => d3.range(num).map((d, i) => {
  const θ = Math.PI * i * (Math.sqrt(5) - 1);
  const r = Math.sqrt(i) * 200 / Math.sqrt(num);

  return {
    position: new Vec2(width / 2 + r * Math.cos(θ), height / 2 - r * Math.sin(θ)),
    velocity: radialVelocity(i / num, { maxVelocity })
  };
});

const initializeSine = ({ num, maxVelocity }, { width, height }) => d3.range(num).map(i => {
  const angle = 2 * Math.PI * i / num;
  const x = width * i / num;
  const y = height / 2 + Math.sin(angle) * height / 4;

  return {
    position: new Vec2(x, y),
    velocity: radialVelocity(i / num, { maxVelocity })
  };
});

const initializeCircle = ({ num, maxVelocity }, { width, height }) => d3.range(num).map(i => {
  const angle = i * 2 * Math.PI / num;
  const x = 200 * Math.sin(angle);
  const y = 200 * Math.cos(angle);

  return {
    position: new Vec2(x + width / 2, y + height / 2),
    velocity: new Vec2(-x, -y).scale(maxVelocity)
  };
});

const initializeCircleRandom = ({ num, maxVelocity }, { width, height }) => d3.range(num).map(i => {
  const angle = i * 2 * Math.PI / num;
  const x = 200 * Math.sin(angle);
  const y = 200 * Math.cos(angle);

  return {
    position: new Vec2(x + width / 2, y + height / 2),
    velocity: randomVelocity({ maxVelocity }).scale(maxVelocity)
  };
});

const initializeFunction = {
  initializeRandom,
  initializePhyllotaxis,
  initializeSine,
  initializeCircle,
  initializeCircleRandom
};

// https://github.com/d3/d3-scale-chromatic
const coloringFunction = {
  'Rainbow': b => b.color,
  'Grey': b => d3.interpolateGreys(0.25 + d3.mean(b.last)),
  'Movement': b => d3.interpolateSpectral(d3.mean(b.last))
};

const updateBoid = (b, context, { width, height }, { radius, coloring, maxVelocity }) => {
  // Update position.
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
  context.fillStyle = coloringFunction[coloring](b);
  context.arc(b.position.x, b.position.y, radius, 0, 2 * Math.PI);
  context.fill();
};

const renderObstacles = (context, obstacles) => {
  context.fillStyle = '#EEE';
  context.filter = 'blur(8px)';

  obstacles.forEach(obstacle => {
    context.beginPath();
    context.arc(obstacle.position.x, obstacle.position.y, obstacle.radius, 0, 2 * Math.PI);
    context.fill();
  });

  context.filter = 'blur(0)';
};

const tick = (boids, obstacles, canvas, offscreenCanvas, { width, height }, config) => {
  const { trail, maxVelocity, alignment, cohesion, separation } = config;

  // Vapor trail.
  const offscreenContext = offscreenCanvas.getContext('2d');

  offscreenContext.globalAlpha = trail;
  offscreenContext.clearRect(0, 0, width, height);
  offscreenContext.drawImage(canvas, 0, 0, width, height);

  renderObstacles(offscreenContext, obstacles);

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);
  context.drawImage(offscreenCanvas, 0, 0, width, height);

  // Update physics.
  boids.forEach(b1 => {
    const forces = {
      alignment: new Vec2(),
      cohesion: new Vec2(),
      separation: new Vec2(),
      avoidance: new Vec2()
    };

    // Avoidance.
    // TODO(burdon): Create force to obstacles/edge (based on angle and distance).
    let avoid = false;
    obstacles.forEach(o => {
      const diff = o.position.clone().subtract(b1.position);
      const distance = diff.length();
      if (distance < o.radius) {
        forces.avoidance.add(diff.clone().scaleTo(-1 / distance)).active = true;
        avoid = true;
      }
    });

    // Flocking (compare with others).
    if (!avoid) {
      boids.forEach(b2 => {
        if (b1 === b2) {
          return;
        }

        const diff = b2.position.clone().subtract(b1.position);
        const distance = diff.length();

        if (distance && distance < separationDistance) {
          forces.separation.add(diff.clone().scaleTo(-1 / distance)).active = true;
        }

        if (distance < flockmateRadius) {
          forces.cohesion.add(diff).active = true;
          forces.alignment.add(b2.velocity).active = true;
        }
      });
    }

    // Compute forces.
    b1.acceleration = new Vec2();
    for (const key in forces) {
      if (forces[key].active && config[key]) {
        forces[key]
          .scaleTo(maxVelocity)
          .subtract(b1.velocity)
          .truncate(config[key]);

        b1.acceleration.add(forces[key]);
      }
    }

    const { coloring } = config;
    if (coloring === 'Movement') {
      b1.last.push(b1.acceleration.length() / (alignment + cohesion + separation));
      if (b1.last.length > 20) {
        b1.last.shift();
      }
    }
  });

  // Update and render boids.
  boids.forEach(boid => updateBoid(boid, context, { width, height }, config));
};

const generateObstacles = ({ width, height }, config) => {
  const { numObstacles = 0 } = config;

  const obstacles = [];
  for (let i = 0; i < numObstacles; i++) {
    obstacles.push({
      position: new Vec2(Math.random() * width, Math.random() * height),
      radius: 20 + Math.random() * 50
    });
  }

  return obstacles;
};

const generateBoids = ({ width, height }, config) => {
  const { num, startingPosition } = config;
  const boids = initializeFunction[`initialize${startingPosition}`](config, { width, height });
  boids.forEach((b, i) => {
    b.color = d3.interpolateRainbow(i / num);
    b.last = [];
  });

  return boids;
};

const map = array => array.reduce((map, value) => {
  map[value] = value; return map;
}, {});

const Flock = () => {
  const canvas = useRef(null);
  const offscreenCanvas = useRef(null);
  const [resizeListener, { width, height }] = useResizeAware();
  const [obstacles, setObstacles] = useState([]);
  const [boids, setBoids] = useState([]);

  // Knobs.
  const num = useNumber('Count', { min: 10, max: 1000, step: 10 }, 100);
  const numObstacles = useNumber('Obstacles', { min: 1, max: 10 }, 5);
  const startingPosition = useSelect('Start', map(['Random', 'Circle', 'CircleRandom', 'Sine', 'Phyllotaxis']));
  const coloring = useSelect('Coloring', map(['Movement', 'Grey', 'Rainbow']));
  const radius = useNumber('Size', { min: 1, max: 20, step: 0.5 }, 2);
  const trail = useNumber('Trail', { min: 0, max: 20 }, 10);
  const maxVelocity = useNumber('Velocity', { min: 1, max: 5, step: 0.1 }, 2);
  const alignment = useNumber('Alignment', { min: 0, max: 10, step: 0.1 }, 3);
  const cohesion = useNumber('Cohension', { min: 0, max: 10, step: 0.1 }, 3);
  const separation = useNumber('Separation', { min: 0, max: 10, step: 0.1 }, 3);
  const avoidance = useNumber('Avoidance', { min: 0, max: 10, step: 0.1 }, 3);

  useEffect(() => {
    if (width && height) {
      setObstacles(generateObstacles({ width, height }, {
        numObstacles
      }));

      setBoids(generateBoids({ width, height }, {
        num,
        startingPosition,
        maxVelocity
      }));
    }
  }, [canvas, offscreenCanvas, width, height, num, numObstacles, startingPosition]);

  useEffect(() => {
    const interval = d3.interval(() => {
      tick(boids, obstacles, canvas.current, offscreenCanvas.current, { width, height }, {
        coloring,
        radius,
        maxVelocity,
        trail: (80 + trail) / 100,
        alignment: alignment / 100,
        cohesion: cohesion / 100,
        separation: separation / 100,
        avoidance: avoidance / 10
      });
    });

    return () => interval.stop();
  }, [boids, radius, coloring, trail, maxVelocity, alignment, cohesion, separation, avoidance]);

  return (
    <div>
      {resizeListener}
      <canvas ref={canvas} width={width} height={height} />
      <canvas ref={offscreenCanvas} width={width} height={height} style={{ display: 'none' }} />
    </div>
  );
};

export const Primary = () => (
  <FullScreen>
    <KnobsProvider>
      <Flock />
      <Knobs className={styles.knobs} />
    </KnobsProvider>
  </FullScreen>
);
