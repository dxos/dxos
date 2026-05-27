//
// Copyright 2026 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type FlockBoid, FlockModel } from './FlockModel';
import { Vec2 } from '../../util';

// Boids flocking.
// https://en.wikipedia.org/wiki/Boids
// https://bl.ocks.org/veltman/995d3a677418100ac43877f3ed1cc728

const FLOCKMATE_RADIUS = 60;
const SEPARATION_DISTANCE = 30;

export type Dimensions = { width: number; height: number };

export type FlockObstacle = {
  position: Vec2;
  radius: number;
};

export type FlockStartingPosition = 'Random' | 'Circle' | 'CircleRandom' | 'Sine' | 'Phyllotaxis';
export type FlockColoring = 'Movement' | 'Grey' | 'Rainbow';

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
  boids: readonly FlockBoid[],
  obstacles: FlockObstacle[],
  cursor: FlockObstacle | null,
  config: TickConfig,
) => {
  const { trail, maxVelocity, alignment, cohesion, separation } = config;

  // Trail fade: paint semi-transparent black over the canvas. GPU-only path, no
  // pixel-buffer roundtrip. Leaves a small rounding-residue at low RGB but the
  // canvas is initialised opaque so α stays 255 and no page background bleeds.
  const context = canvas.getContext('2d')!;
  context.fillStyle = `rgba(0, 0, 0, ${1 - trail})`;
  context.fillRect(0, 0, width, height);

  // Obstacles re-paint at full alpha every frame so they don't decay with the trail.
  renderObstacles(context, obstacles);

  // Calculate forces.
  boids.forEach((b1) => {
    const forces: Record<'alignment' | 'cohesion' | 'separation' | 'avoidance', Vec2> = {
      alignment: new Vec2(),
      cohesion: new Vec2(),
      separation: new Vec2(),
      avoidance: new Vec2(),
    };

    let avoid = false;
    const repel = (o: FlockObstacle) => {
      const diff = o.position.clone().subtract(b1.position);
      const distance = diff.length();
      // Guard against distance === 0: scaleTo divides by length and would
      // poison the simulation with Infinity/NaN if a boid lands on the source.
      if (distance > 0 && distance < o.radius) {
        forces.avoidance.add(diff.clone().scaleTo(-1 / distance));
        forces.avoidance.active = true;
        avoid = true;
      }
    };
    obstacles.forEach(repel);
    if (cursor) {
      repel(cursor);
    }

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

/**
 * Generate the default boid set when a caller doesn't supply a populate callback.
 * Honors `num`, `startingPosition`, and `maxVelocity`; assigns a rainbow color
 * and an empty history.
 */
const generateDefaultBoids = (
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

export type FlockProps = ThemedClassName<{
  /**
   * Reactive source of truth for the boid array. Flock subscribes via `model.subscribe`
   * and restarts the simulation whenever `setBoids` replaces the array. Per-tick
   * position changes are mutated in place on the same boid objects — external readers
   * (e.g. an explorer that handed in boids with ids) sample those positions any time
   * via `model.boids` / `model.findBoid`.
   *
   * When the model starts empty, Flock generates a default boid set from `num` and
   * `startingPosition` once the container is first measured, and writes it into the
   * model. The `populate` callback overrides that default population.
   */
  model: FlockModel;
  /**
   * Optional initial-population callback. Called once when the container is first
   * measured AND the model is empty. Use this to position boids using canvas
   * dimensions (top-left origin) — typically when seeding from an external layout.
   */
  populate?: (dimensions: Dimensions) => readonly FlockBoid[];
  /** Used only when `populate` is not provided. */
  num?: number;
  /** Used only when `populate` is not provided. */
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
  /** Pixel radius of the invisible repel zone tracking the pointer. 0 disables. */
  cursorRepel?: number;
}>;

/**
 * Canvas-rendered boids flocking simulation. The boid array is owned by `model`
 * (a `FlockModel`); Flock subscribes to it and mutates per-boid `position`,
 * `velocity`, and `acceleration` in place each tick.
 */
export const Flock = ({
  classNames,
  model,
  populate,
  num = 100,
  startingPosition = 'CircleRandom',
  numObstacles = 0,
  coloring = 'Movement',
  radius = 2,
  trail = 15,
  maxVelocity = 0.5,
  alignment = 3,
  cohesion = 3,
  separation = 3,
  avoidance = 3,
  cursorRepel = 120,
}: FlockProps) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  // Cursor in canvas-local coordinates, or null while the pointer is outside.
  // Tracked via ref so mouse moves don't re-render or restart the simulation.
  const cursorRef = useRef<Vec2 | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [{ width, height }, setSize] = useState<Dimensions>({ width: 0, height: 0 });
  const [obstacles, setObstacles] = useState<FlockObstacle[]>([]);
  // Local snapshot of `model.boids` — the simulation reads from this so that
  // changing the model identity via `setBoids` triggers a clean restart.
  const [boids, setBoids] = useState<readonly FlockBoid[]>(() => model.boids);

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

  // Track the model's boid array via subscribe → setBoids. Per-tick position
  // mutations don't emit on the atom (by design), so this only fires on
  // `model.setBoids(...)` and the initial sync.
  useEffect(() => {
    setBoids(model.boids);
    return model.subscribe(() => setBoids(model.boids));
  }, [model]);

  // Populate the model once the container dimensions are known and the model is
  // empty. Subsequent resizes don't repopulate — the caller owns that decision.
  const populatedRef = useRef(false);
  useEffect(() => {
    if (!width || !height || populatedRef.current) {
      return;
    }
    if (model.boids.length > 0) {
      populatedRef.current = true;
      return;
    }
    const seeded = populate
      ? populate({ width, height })
      : generateDefaultBoids({ width, height }, { num, maxVelocity, startingPosition });
    model.setBoids(seeded);
    populatedRef.current = true;
  }, [model, width, height, populate, num, maxVelocity, startingPosition]);

  // Obstacles are derived from container size + count; regenerate on either change.
  useEffect(() => {
    if (!width || !height) {
      return;
    }
    setObstacles(generateFlockObstacles({ width, height }, numObstacles));
  }, [width, height, numObstacles]);

  // The trail/physics config bundled for tick; memoed so the interval effect
  // below doesn't re-key on every parent render.
  const tickConfig = useMemo<TickConfig>(
    () => ({
      coloring,
      radius,
      maxVelocity,
      trail: (80 + trail) / 100,
      alignment: alignment / 100,
      cohesion: cohesion / 100,
      separation: separation / 100,
      avoidance: avoidance / 10,
    }),
    [coloring, radius, maxVelocity, trail, alignment, cohesion, separation, avoidance],
  );

  useEffect(() => {
    if (!canvas.current || !width || !height) {
      return;
    }

    // Initialise the canvas to opaque black so the per-frame fillRect fade
    // (rgba(0,0,0,1-trail) source-over) keeps α=255 and the page background
    // can't bleed through asymptotic-α gaps.
    const ctx = canvas.current.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    const interval = d3.interval(() => {
      const cursor =
        cursorRepel > 0 && cursorRef.current ? { position: cursorRef.current, radius: cursorRepel } : null;
      tick(canvas.current!, { width, height }, boids, obstacles, cursor, tickConfig);
    });

    return () => interval.stop();
  }, [boids, obstacles, width, height, tickConfig, cursorRepel]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (cursorRef.current) {
      cursorRef.current.x = x;
      cursorRef.current.y = y;
    } else {
      cursorRef.current = new Vec2(x, y);
    }
  };
  const handlePointerLeave = () => {
    cursorRef.current = null;
  };

  return (
    <div
      className={mx('dx-expander absolute inset-0', classNames)}
      ref={setContainer}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <canvas ref={canvas} width={width} height={height} />
    </div>
  );
};
