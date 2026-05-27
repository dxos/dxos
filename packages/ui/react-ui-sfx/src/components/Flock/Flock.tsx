//
// Copyright 2026 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { Vec2 } from '../../util';

// Boids flocking.
// https://en.wikipedia.org/wiki/Boids
// https://bl.ocks.org/veltman/995d3a677418100ac43877f3ed1cc728

const FLOCKMATE_RADIUS = 60;
const SEPARATION_DISTANCE = 30;

export type Dimensions = { width: number; height: number };

export type FlockBoid = {
  position: Vec2;
  velocity: Vec2;
  acceleration?: Vec2;
  color?: string;
  last?: number[];
};

export type FlockObstacle = {
  position: Vec2;
  radius: number;
};

export type FlockStartingPosition = 'Random' | 'Circle' | 'CircleRandom' | 'Sine' | 'Phyllotaxis';
export type FlockColoring = 'Movement' | 'Grey' | 'Rainbow';

export type FlockSeed = {
  /** Absolute x position in container coordinates (origin top-left). */
  x: number;
  /** Absolute y position in container coordinates (origin top-left). */
  y: number;
  /** Optional initial velocity. Defaults to a random velocity scaled by `maxVelocity`. */
  vx?: number;
  vy?: number;
  color?: string;
};

const randomVelocity = (maxVelocity: number): Vec2 =>
  new Vec2(1 - Math.random() * 2, 1 - Math.random() * 2).scale(maxVelocity);

const radialVelocity = (p: number, maxVelocity: number): Vec2 =>
  new Vec2(Math.sin(2 * Math.PI * p), Math.cos(2 * Math.PI * p)).scale(maxVelocity);

const initializeRandom = (num: number, maxVelocity: number, { width, height }: Dimensions): FlockBoid[] =>
  d3.range(num).map(() => ({
    position: new Vec2(Math.random() * width, Math.random() * height),
    velocity: randomVelocity(maxVelocity),
  }));

const initializePhyllotaxis = (num: number, maxVelocity: number, { width, height }: Dimensions): FlockBoid[] =>
  d3.range(num).map((_d, i) => {
    const theta = Math.PI * i * (Math.sqrt(5) - 1);
    const r = (Math.sqrt(i) * 200) / Math.sqrt(num);
    return {
      position: new Vec2(width / 2 + r * Math.cos(theta), height / 2 - r * Math.sin(theta)),
      velocity: radialVelocity(i / num, maxVelocity),
    };
  });

const initializeSine = (num: number, maxVelocity: number, { width, height }: Dimensions): FlockBoid[] =>
  d3.range(num).map((i) => {
    const angle = (2 * Math.PI * i) / num;
    const x = (width * i) / num;
    const y = height / 2 + (Math.sin(angle) * height) / 4;
    return {
      position: new Vec2(x, y),
      velocity: radialVelocity(i / num, maxVelocity),
    };
  });

const initializeCircle = (num: number, maxVelocity: number, { width, height }: Dimensions): FlockBoid[] =>
  d3.range(num).map((i) => {
    const angle = (i * 2 * Math.PI) / num;
    const x = 200 * Math.sin(angle);
    const y = 200 * Math.cos(angle);
    return {
      position: new Vec2(x + width / 2, y + height / 2),
      velocity: new Vec2(-x, -y).scale(maxVelocity),
    };
  });

const initializeCircleRandom = (num: number, maxVelocity: number, { width, height }: Dimensions): FlockBoid[] =>
  d3.range(num).map((i) => {
    const angle = (i * 2 * Math.PI) / num;
    const x = 200 * Math.sin(angle);
    const y = 200 * Math.cos(angle);
    return {
      position: new Vec2(x + width / 2, y + height / 2),
      velocity: randomVelocity(maxVelocity),
    };
  });

const startingInitializers: Record<
  FlockStartingPosition,
  (num: number, maxVelocity: number, dim: Dimensions) => FlockBoid[]
> = {
  Random: initializeRandom,
  Phyllotaxis: initializePhyllotaxis,
  Sine: initializeSine,
  Circle: initializeCircle,
  CircleRandom: initializeCircleRandom,
};

const coloringFunction: Record<FlockColoring, (boid: FlockBoid) => string> = {
  Rainbow: (b) => b.color ?? '#000',
  Grey: (b) => d3.interpolateGreys(0.25 + d3.mean(b.last ?? [0])!),
  Movement: (b) => d3.interpolateSpectral(d3.mean(b.last ?? [0])!),
};

type TickConfig = {
  trail: number;
  maxVelocity: number;
  alignment: number;
  cohesion: number;
  separation: number;
  avoidance: number;
  radius: number;
  coloring: FlockColoring;
};

const updateBoid = (
  b: FlockBoid,
  context: CanvasRenderingContext2D,
  { width, height }: Dimensions,
  { radius, coloring, maxVelocity }: Pick<TickConfig, 'radius' | 'coloring' | 'maxVelocity'>,
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

const renderObstacles = (context: CanvasRenderingContext2D, obstacles: FlockObstacle[]) => {
  context.fillStyle = 'darkred';
  context.filter = 'blur(40px)';

  obstacles.forEach((obstacle) => {
    context.beginPath();
    context.arc(obstacle.position.x, obstacle.position.y, obstacle.radius, 0, 2 * Math.PI);
    context.fill();
  });

  context.filter = 'blur(0)';
};

const tick = (
  canvas: HTMLCanvasElement,
  { width, height }: Dimensions,
  boids: FlockBoid[],
  obstacles: FlockObstacle[],
  config: TickConfig,
) => {
  const { trail, maxVelocity, alignment, cohesion, separation } = config;

  // Trail fade: paint semi-transparent black over the previous frame so older
  // pixels darken additively toward true #000. The alternative (alpha-blitting
  // onto a cleared buffer) stalls at α ≈ 3–4 / 255 due to integer rounding,
  // leaving a permanent ~#0f residue over a dark page.
  const context = canvas.getContext('2d')!;
  context.fillStyle = `rgba(0, 0, 0, ${1 - trail})`;
  context.fillRect(0, 0, width, height);

  // Obstacles re-paint at full alpha every frame so they don't decay with the trail.
  renderObstacles(context, obstacles);

  boids.forEach((b1) => {
    const forces: Record<'alignment' | 'cohesion' | 'separation' | 'avoidance', Vec2> = {
      alignment: new Vec2(),
      cohesion: new Vec2(),
      separation: new Vec2(),
      avoidance: new Vec2(),
    };

    let avoid = false;
    obstacles.forEach((o) => {
      const diff = o.position.clone().subtract(b1.position);
      const distance = diff.length();
      // Guard against distance === 0: scaleTo divides by length and would
      // poison the simulation with Infinity/NaN if a boid lands on an obstacle.
      if (distance > 0 && distance < o.radius) {
        forces.avoidance.add(diff.clone().scaleTo(-1 / distance));
        forces.avoidance.active = true;
        avoid = true;
      }
    });

    if (!avoid) {
      boids.forEach((b2) => {
        if (b1 === b2) {
          return;
        }

        const diff = b2.position.clone().subtract(b1.position);
        const distance = diff.length();
        if (distance && distance < SEPARATION_DISTANCE) {
          forces.separation.add(diff.clone().scaleTo(-1 / distance));
          forces.separation.active = true;
        }

        if (distance < FLOCKMATE_RADIUS) {
          forces.cohesion.add(diff);
          forces.cohesion.active = true;
          forces.alignment.add(b2.velocity);
          forces.alignment.active = true;
        }
      });
    }

    b1.acceleration = new Vec2();
    (Object.keys(forces) as Array<keyof typeof forces>).forEach((key) => {
      const force = forces[key];
      const weight = config[key];
      if (force.active && weight) {
        force.scaleTo(maxVelocity).subtract(b1.velocity).truncate(weight);
        b1.acceleration!.add(force);
      }
    });

    // Movement and Grey both read from `b1.last` to colorize; record the same history
    // for both so Grey isn't stuck at an empty array (which yields NaN colors).
    const { coloring } = config;
    if (coloring === 'Movement' || coloring === 'Grey') {
      const last = b1.last ?? (b1.last = []);
      const sum = alignment + cohesion + separation;
      last.push(sum > 0 ? b1.acceleration.length() / sum : 0);
      if (last.length > 20) {
        last.shift();
      }
    }
  });

  boids.forEach((boid) => updateBoid(boid, context, { width, height }, config));
};

const generateFlockObstacles = (dimensions: Dimensions, numObstacles: number): FlockObstacle[] => {
  const obstacles: FlockObstacle[] = [];
  for (let i = 0; i < numObstacles; i++) {
    obstacles.push({
      position: new Vec2(Math.random() * dimensions.width, Math.random() * dimensions.height),
      radius: 20 + Math.random() * 50,
    });
  }
  return obstacles;
};

const generateFlockBoids = (
  dimensions: Dimensions,
  config: { num: number; maxVelocity: number; startingPosition: FlockStartingPosition },
): FlockBoid[] => {
  const { num, startingPosition, maxVelocity } = config;
  const boids = startingInitializers[startingPosition](num, maxVelocity, dimensions);
  boids.forEach((b, i) => {
    b.color = d3.interpolateRainbow(i / num);
    b.last = [];
  });
  return boids;
};

const seedsToBoids = (seeds: readonly FlockSeed[], maxVelocity: number): FlockBoid[] =>
  seeds.map((seed, i) => ({
    position: new Vec2(seed.x, seed.y),
    velocity: seed.vx != null && seed.vy != null ? new Vec2(seed.vx, seed.vy) : randomVelocity(maxVelocity),
    color: seed.color ?? d3.interpolateRainbow(seeds.length > 0 ? i / seeds.length : 0),
    last: [],
  }));

export type FlockProps = ThemedClassName<{
  /**
   * Resolve the initial boid seeds given the container's dimensions. Called whenever the
   * container resizes or the callback identity changes. When omitted, boids are generated
   * from `num` and `startingPosition`.
   */
  seeds?: (dimensions: Dimensions) => readonly FlockSeed[];
  /** Used only when `seeds` is not provided. */
  num?: number;
  /** Used only when `seeds` is not provided. */
  startingPosition?: FlockStartingPosition;
  numObstacles?: number;
  coloring?: FlockColoring;
  /** Per-boid render radius in pixels. */
  radius?: number;
  /** Vapor trail factor, 0..20. */
  trail?: number;
  maxVelocity?: number;
  alignment?: number;
  cohesion?: number;
  separation?: number;
  avoidance?: number;
}>;

/**
 * Canvas-rendered boids flocking simulation. When `seeds` is provided, each boid starts at
 * the supplied position so callers can hand off positions from another layout.
 * Without `seeds`, boids are generated from `num` and `startingPosition`.
 */
export const Flock = ({
  classNames,
  seeds,
  num = 100,
  startingPosition = 'CircleRandom',
  numObstacles = 0,
  coloring = 'Movement',
  radius = 2,
  trail = 10,
  maxVelocity = 0.5,
  alignment = 3,
  cohesion = 3,
  separation = 3,
  avoidance = 3,
}: FlockProps) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [{ width, height }, setSize] = useState<Dimensions>({ width: 0, height: 0 });
  const [obstacles, setObstacles] = useState<FlockObstacle[]>([]);
  const [boids, setBoids] = useState<FlockBoid[]>([]);

  useEffect(() => {
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const { width: w, height: h } = entry.contentRect;
      setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  useEffect(() => {
    if (!width || !height) {
      return;
    }

    setObstacles(generateFlockObstacles({ width, height }, numObstacles));
    setBoids(
      seeds
        ? seedsToBoids(seeds({ width, height }), maxVelocity)
        : generateFlockBoids({ width, height }, { num, startingPosition, maxVelocity }),
    );
  }, [width, height, num, numObstacles, startingPosition, maxVelocity, seeds]);

  useEffect(() => {
    if (!canvas.current || !width || !height) {
      return;
    }

    const interval = d3.interval(() => {
      tick(canvas.current!, { width, height }, boids, obstacles, {
        coloring,
        radius,
        maxVelocity,
        trail: (85 + trail) / 100,
        alignment: alignment / 100,
        cohesion: cohesion / 100,
        separation: separation / 100,
        avoidance: avoidance / 10,
      });
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
    <div className={mx('dx-expander absolute inset-0', classNames)} ref={setContainer}>
      <canvas ref={canvas} width={width} height={height} />
    </div>
  );
};
