//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  SWARM_VARIANTS,
  applyOutro,
  createDots,
  defaultSwarmConfig,
  dotFill,
  litCount,
  outroFactor,
  pickRandomVariant,
  projectNogo,
  slotPosition,
  stepSettle,
} from './swarm';

describe('defaultSwarmConfig', () => {
  test('per-variant dot counts and sizes match the spec', ({ expect }) => {
    expect(defaultSwarmConfig('wander')).toMatchObject({ dotCount: 20, dotSize: 2.8, ringRotationSpeed: 0 });
    expect(defaultSwarmConfig('orbit')).toMatchObject({ dotCount: 32, dotSize: 2.0, ringRotationSpeed: 0.00015 });
    expect(defaultSwarmConfig('trails')).toMatchObject({ dotCount: 48, dotSize: 1.6 });
    expect(defaultSwarmConfig('linked')).toMatchObject({ dotCount: 64, dotSize: 1.3 });
  });
});

describe('pickRandomVariant', () => {
  test('covers all four variants uniformly', ({ expect }) => {
    expect(pickRandomVariant(() => 0)).toBe(SWARM_VARIANTS[0]);
    expect(pickRandomVariant(() => 0.99)).toBe(SWARM_VARIANTS[3]);
  });
});

describe('createDots', () => {
  test("slots run anticlockwise from 12 o'clock", ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    const dots = createDots(config, () => 0.5);
    // Slot 0 at 12 o'clock; later slots decrease in angle (anticlockwise on screen).
    expect(dots[0].angle).toBeCloseTo(-Math.PI / 2);
    expect(dots[1].angle).toBeLessThan(dots[0].angle);
    // First slot position: directly above center at ring radius.
    const slot0 = slotPosition(config, dots[0], 0);
    expect(slot0.x).toBeCloseTo(config.centerX);
    expect(slot0.y).toBeCloseTo(config.centerY - config.ringRadius);
  });

  test('entry positions sit on the outer circle', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    for (const dot of createDots(config, () => 0.5)) {
      const radius = Math.hypot(dot.startX - config.centerX, dot.startY - config.centerY);
      expect(radius).toBeCloseTo(config.outerRadius);
    }
  });
});

describe('slotPosition', () => {
  test('is static for non-orbit variants and rigidly rotating for orbit', ({ expect }) => {
    const wander = defaultSwarmConfig('wander');
    const staticDot = createDots(wander, () => 0.5)[3];
    expect(slotPosition(wander, staticDot, 0)).toEqual(slotPosition(wander, staticDot, 5000));

    const orbit = defaultSwarmConfig('orbit');
    const dots = createDots(orbit, () => 0.5);
    const early = [slotPosition(orbit, dots[0], 1000), slotPosition(orbit, dots[7], 1000)];
    const late = [slotPosition(orbit, dots[0], 3000), slotPosition(orbit, dots[7], 3000)];
    // Slots moved…
    expect(Math.hypot(late[0].x - early[0].x, late[0].y - early[0].y)).toBeGreaterThan(0.1);
    // …but pairwise distance is preserved (rigid structure).
    const distance = (pair: { x: number; y: number }[]) => Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y);
    expect(distance(late)).toBeCloseTo(distance(early), 5);
  });
});

describe('stepSettle', () => {
  test('docks immediately on its turn and never regresses while lit', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    const dot = createDots(config, () => 0.5)[0];
    expect(stepSettle(config, dot, 0, 0, 16)).toBe(0); // not lit: stays unsettled
    stepSettle(config, dot, 0, 1, config.settleMs); // lit: one full settle window
    expect(dot.settle).toBe(1);
    stepSettle(config, dot, 0, 1, 16);
    expect(dot.settle).toBe(1); // stays docked
  });
});

describe('litCount', () => {
  test('maps progress percent onto the dot count', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    expect(litCount(config, 0)).toBe(0);
    expect(litCount(config, 50)).toBeCloseTo(config.dotCount / 2);
    expect(litCount(config, 100)).toBe(config.dotCount);
  });
});

describe('projectNogo', () => {
  test('projects interior points to the rim and leaves exterior points alone', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    const inside = projectNogo(config, config.centerX + 10, config.centerY);
    expect(Math.hypot(inside.x - config.centerX, inside.y - config.centerY)).toBeCloseTo(config.nogoRadius);
    const outside = projectNogo(config, config.centerX + 200, config.centerY);
    expect(outside).toEqual({ x: config.centerX + 200, y: config.centerY });
  });
});

describe('dotFill', () => {
  test('grey while colourless, brand navy when docked and colourized', ({ expect }) => {
    expect(dotFill(0, 0)).toBe('rgb(64,64,64)');
    expect(dotFill(1, 0)).toBe('rgb(140,140,140)');
    expect(dotFill(1, 1)).toBe('rgb(5,40,61)');
  });
});

describe('outro', () => {
  test('outroFactor is 0 before dismissal and sweeps over outroMs', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    expect(outroFactor(config, undefined)).toBe(0);
    expect(outroFactor(config, 0)).toBe(0);
    expect(outroFactor(config, config.outroMs)).toBe(1);
  });

  test('applyOutro flings radially, shrinks toward 15%, and fades', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    const flung = applyOutro(config, config.centerX + config.ringRadius, config.centerY, 1);
    expect(flung.x).toBeCloseTo(config.centerX + config.ringRadius * (1 + config.outroScale));
    expect(flung.radiusScale).toBeCloseTo(0.15);
    expect(flung.opacityScale).toBeCloseTo(0);
  });
});
