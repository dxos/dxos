//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as d3 from 'd3';
import { useControls } from 'leva';
import React, { useEffect, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Vec2 } from '../../util';

// Boids flocking.
// https://en.wikipedia.org/wiki/Boids
// https://bl.ocks.org/veltman/995d3a677418100ac43877f3ed1cc728

const flockmateRadius = 60;
const separationDistance = 30;

type Boid = {
  position: Vec2;
  velocity: Vec2;
  acceleration?: Vec2;
  color?: string;
  last?: number[];
};

type Obstacle = {
  position: Vec2;
  radius: number;
};

type Dimensions = { width: number; height: number };

type StartingPosition = 'Random' | 'Circle' | 'CircleRandom' | 'Sine' | 'Phyllotaxis';
type Coloring = 'Movement' | 'Grey' | 'Rainbow';

type Config = {
  num: number;
  numObstacles: number;
  startingPosition: StartingPosition;
  coloring: Coloring;
  radius: number;
  trail: number;
  maxVelocity: number;
  alignment: number;
  cohesion: number;
  separation: number;
  avoidance: number;
};

const randomVelocity = ({ maxVelocity }: { maxVelocity: number }) =>
  new Vec2(1 - Math.random() * 2, 1 - Math.random() * 2).scale(maxVelocity);

const radialVelocity = (p: number, { maxVelocity }: { maxVelocity: number }) =>
  new Vec2(Math.sin(2 * Math.PI * p), Math.cos(2 * Math.PI * p)).scale(maxVelocity);

const initializeRandom = (
  { num, maxVelocity }: { num: number; maxVelocity: number },
  { width, height }: Dimensions,
): Boid[] =>
  d3.range(num).map(() => ({
    position: new Vec2(Math.random() * width, Math.random() * height),
    velocity: randomVelocity({ maxVelocity }),
  }));

const initializePhyllotaxis = (
  { num, maxVelocity }: { num: number; maxVelocity: number },
  { width, height }: Dimensions,
): Boid[] =>
  d3.range(num).map((_d, i) => {
    const theta = Math.PI * i * (Math.sqrt(5) - 1);
    const r = (Math.sqrt(i) * 200) / Math.sqrt(num);
    return {
      position: new Vec2(width / 2 + r * Math.cos(theta), height / 2 - r * Math.sin(theta)),
      velocity: radialVelocity(i / num, { maxVelocity }),
    };
  });

const initializeSine = (
  { num, maxVelocity }: { num: number; maxVelocity: number },
  { width, height }: Dimensions,
): Boid[] =>
  d3.range(num).map((i) => {
    const angle = (2 * Math.PI * i) / num;
    const x = (width * i) / num;
    const y = height / 2 + (Math.sin(angle) * height) / 4;
    return {
      position: new Vec2(x, y),
      velocity: radialVelocity(i / num, { maxVelocity }),
    };
  });

const initializeCircle = (
  { num, maxVelocity }: { num: number; maxVelocity: number },
  { width, height }: Dimensions,
): Boid[] =>
  d3.range(num).map((i) => {
    const angle = (i * 2 * Math.PI) / num;
    const x = 200 * Math.sin(angle);
    const y = 200 * Math.cos(angle);
    return {
      position: new Vec2(x + width / 2, y + height / 2),
      velocity: new Vec2(-x, -y).scale(maxVelocity),
    };
  });

const initializeCircleRandom = (
  { num, maxVelocity }: { num: number; maxVelocity: number },
  { width, height }: Dimensions,
): Boid[] =>
  d3.range(num).map((i) => {
    const angle = (i * 2 * Math.PI) / num;
    const x = 200 * Math.sin(angle);
    const y = 200 * Math.cos(angle);
    return {
      position: new Vec2(x + width / 2, y + height / 2),
      velocity: randomVelocity({ maxVelocity }),
    };
  });

const initializeFunction: Record<
  StartingPosition,
  (
    cfg: {
      num: number;
      maxVelocity: number;
    },
    dim: Dimensions,
  ) => Boid[]
> = {
  Random: initializeRandom,
  Phyllotaxis: initializePhyllotaxis,
  Sine: initializeSine,
  Circle: initializeCircle,
  CircleRandom: initializeCircleRandom,
};

// https://github.com/d3/d3-scale-chromatic
const coloringFunction: Record<Coloring, (boid: Boid) => string> = {
  Rainbow: (b) => b.color ?? '#000',
  Grey: (b) => d3.interpolateGreys(0.25 + d3.mean(b.last ?? [0])!),
  Movement: (b) => d3.interpolateSpectral(d3.mean(b.last ?? [0])!),
};

const updateBoid = (
  b: Boid,
  context: CanvasRenderingContext2D,
  { width, height }: Dimensions,
  { radius, coloring, maxVelocity }: Pick<Config, 'radius' | 'coloring' | 'maxVelocity'>,
) => {
  b.position.add(b.velocity.add(b.acceleration!).truncate(maxVelocity));

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

const renderObstacles = (context: CanvasRenderingContext2D, obstacles: Obstacle[]) => {
  context.fillStyle = 'darkred';
  context.filter = 'blur(40px)';

  obstacles.forEach((obstacle) => {
    context.beginPath();
    context.arc(obstacle.position.x, obstacle.position.y, obstacle.radius, 0, 2 * Math.PI);
    context.fill();
  });

  context.filter = 'blur(0)';
};

type TickConfig = Pick<
  Config,
  'trail' | 'maxVelocity' | 'alignment' | 'cohesion' | 'separation' | 'avoidance' | 'radius' | 'coloring'
>;

const tick = (
  boids: Boid[],
  obstacles: Obstacle[],
  canvas: HTMLCanvasElement,
  offscreenCanvas: HTMLCanvasElement,
  { width, height }: Dimensions,
  config: TickConfig,
) => {
  const { trail, maxVelocity, alignment, cohesion, separation } = config;

  // Vapor trail.
  const offscreenContext = offscreenCanvas.getContext('2d')!;
  offscreenContext.globalAlpha = trail;
  offscreenContext.clearRect(0, 0, width, height);
  offscreenContext.drawImage(canvas, 0, 0, width, height);

  renderObstacles(offscreenContext, obstacles);

  const context = canvas.getContext('2d')!;
  context.clearRect(0, 0, width, height);
  context.drawImage(offscreenCanvas, 0, 0, width, height);

  // Update physics.
  boids.forEach((b1) => {
    const forces: Record<'alignment' | 'cohesion' | 'separation' | 'avoidance', Vec2> = {
      alignment: new Vec2(),
      cohesion: new Vec2(),
      separation: new Vec2(),
      avoidance: new Vec2(),
    };

    // Avoidance.
    let avoid = false;
    obstacles.forEach((o) => {
      const diff = o.position.clone().subtract(b1.position);
      const distance = diff.length();
      if (distance < o.radius) {
        forces.avoidance.add(diff.clone().scaleTo(-1 / distance));
        forces.avoidance.active = true;
        avoid = true;
      }
    });

    // Flocking (compare with others).
    if (!avoid) {
      boids.forEach((b2) => {
        if (b1 === b2) {
          return;
        }

        const diff = b2.position.clone().subtract(b1.position);
        const distance = diff.length();

        if (distance && distance < separationDistance) {
          forces.separation.add(diff.clone().scaleTo(-1 / distance));
          forces.separation.active = true;
        }

        if (distance < flockmateRadius) {
          forces.cohesion.add(diff);
          forces.cohesion.active = true;
          forces.alignment.add(b2.velocity);
          forces.alignment.active = true;
        }
      });
    }

    // Compute forces.
    b1.acceleration = new Vec2();
    (Object.keys(forces) as Array<keyof typeof forces>).forEach((key) => {
      const force = forces[key];
      const weight = config[key];
      if (force.active && weight) {
        force.scaleTo(maxVelocity).subtract(b1.velocity).truncate(weight);
        b1.acceleration!.add(force);
      }
    });

    const { coloring } = config;
    if (coloring === 'Movement') {
      const last = b1.last ?? (b1.last = []);
      const sum = alignment + cohesion + separation;
      last.push(sum > 0 ? b1.acceleration.length() / sum : 0);
      if (last.length > 20) {
        last.shift();
      }
    }
  });

  // Update and render boids.
  boids.forEach((boid) => updateBoid(boid, context, { width, height }, config));
};

const generateObstacles = ({ width, height }: Dimensions, { numObstacles }: { numObstacles: number }): Obstacle[] => {
  const obstacles: Obstacle[] = [];
  for (let i = 0; i < numObstacles; i++) {
    obstacles.push({
      position: new Vec2(Math.random() * width, Math.random() * height),
      radius: 20 + Math.random() * 50,
    });
  }
  return obstacles;
};

const generateBoids = (
  dimensions: Dimensions,
  config: { num: number; maxVelocity: number; startingPosition: StartingPosition },
): Boid[] => {
  const { num, startingPosition } = config;
  const boids = initializeFunction[startingPosition](config, dimensions);
  boids.forEach((b, i) => {
    b.color = d3.interpolateRainbow(i / num);
    b.last = [];
  });

  return boids;
};

const Flock = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const buffer = useRef<HTMLCanvasElement>(null);
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>();
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [boids, setBoids] = useState<Boid[]>([]);

  const {
    num,
    numObstacles,
    startingPosition,
    coloring,
    radius,
    trail,
    maxVelocity,
    alignment,
    cohesion,
    separation,
    avoidance,
  } = useControls({
    num: {
      label: 'Count',
      value: 100,
      min: 10,
      max: 1000,
      step: 10,
    },
    numObstacles: {
      label: 'Obstacles',
      value: 0,
      min: 0,
      max: 10,
      step: 1,
    },
    startingPosition: {
      label: 'Start',
      value: 'CircleRandom' as StartingPosition,
      options: ['Random', 'Circle', 'CircleRandom', 'Sine', 'Phyllotaxis'] as StartingPosition[],
    },
    coloring: {
      label: 'Coloring',
      value: 'Movement' as Coloring,
      options: ['Movement', 'Grey', 'Rainbow'] as Coloring[],
    },
    radius: { label: 'Size', value: 2, min: 1, max: 20, step: 0.5 },
    trail: { label: 'Trail', value: 10, min: 0, max: 20, step: 1 },
    maxVelocity: { label: 'Velocity', value: 2, min: 1, max: 5, step: 0.1 },
    alignment: { label: 'Alignment', value: 3, min: 0, max: 10, step: 0.1 },
    cohesion: { label: 'Cohesion', value: 3, min: 0, max: 10, step: 0.1 },
    separation: { label: 'Separation', value: 3, min: 0, max: 10, step: 0.1 },
    avoidance: { label: 'Avoidance', value: 3, min: 0, max: 10, step: 0.1 },
  });

  useEffect(() => {
    if (width && height) {
      setObstacles(generateObstacles({ width, height }, { numObstacles }));
      setBoids(generateBoids({ width, height }, { num, startingPosition, maxVelocity }));
    }
  }, [width, height, num, numObstacles, startingPosition, maxVelocity]);

  useEffect(() => {
    if (!canvas.current || !buffer.current || !width || !height) {
      return;
    }

    const interval = d3.interval(() => {
      tick(
        boids,
        obstacles,
        canvas.current!,
        buffer.current!,
        {
          width,
          height,
        },
        {
          coloring,
          radius,
          maxVelocity,
          trail: (80 + trail) / 100,
          alignment: alignment / 100,
          cohesion: cohesion / 100,
          separation: separation / 100,
          avoidance: avoidance / 10,
        },
      );
    });

    return () => interval.stop();
  }, [
    boids,
    obstacles,
    width,
    height,
    radius,
    coloring,
    trail,
    maxVelocity,
    alignment,
    cohesion,
    separation,
    avoidance,
  ]);

  return (
    <div ref={containerRef} className='absolute inset-0'>
      <canvas ref={canvas} width={width} height={height} />
      <canvas ref={buffer} width={width} height={height} style={{ display: 'none' }} />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-sfx/Flock',
  component: Flock,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Flock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
