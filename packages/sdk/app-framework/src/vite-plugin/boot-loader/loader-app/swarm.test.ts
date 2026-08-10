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
  dotPosition,
  litCount,
  outroFactor,
  pickRandomVariant,
  projectNogo,
  ringLinkVisible,
  slotPosition,
  stepSettle,
  transientLinks,
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

describe('dotPosition', () => {
  test('fully settled dot sits exactly on its slot', ({ expect }) => {
    const config = defaultSwarmConfig('wander');
    const dot = createDots(config, () => 0.5)[0];
    dot.settle = 1;
    const position = dotPosition(config, dot, 1, 1234);
    const slot = slotPosition(config, dot, 1234);
    expect(position.x).toBeCloseTo(slot.x);
    expect(position.y).toBeCloseTo(slot.y);
  });

  test('unsettled dots stay outside the no-go zone in every variant', ({ expect }) => {
    for (const variant of SWARM_VARIANTS) {
      const config = defaultSwarmConfig(variant);
      const dots = createDots(config, () => 0.99); // worst case: tight orbit radii
      for (let now = 0; now < 5000; now += 250) {
        for (const dot of dots) {
          const { x, y } = dotPosition(config, dot, 0, now);
          expect(Math.hypot(x - config.centerX, y - config.centerY)).toBeGreaterThanOrEqual(config.nogoRadius - 1e-6);
        }
      }
    }
  });

  test('orbit variant: settled dots track the rotating slot (never static)', ({ expect }) => {
    const config = defaultSwarmConfig('orbit');
    const dot = createDots(config, () => 0.5)[0];
    dot.settle = 1;
    const early = dotPosition(config, dot, 1, 1000);
    const late = dotPosition(config, dot, 1, 2000);
    expect(Math.hypot(late.x - early.x, late.y - early.y)).toBeGreaterThan(0.05);
  });
});

describe('transientLinks', () => {
  test('links only near, unsettled pairs and respects the cap', ({ expect }) => {
    const config = defaultSwarmConfig('linked');
    const dots = createDots(config, () => 0.5);
    // Cluster three dots, dock one of them, scatter the rest far away.
    dots.forEach((dot, index) => {
      dot.x = 1000 + index * 200;
      dot.y = 1000;
      dot.settle = 0;
    });
    dots[0].x = 100;
    dots[0].y = 100;
    dots[1].x = 110;
    dots[1].y = 100;
    dots[2].x = 105;
    dots[2].y = 108;
    dots[3].x = 102;
    dots[3].y = 95;
    dots[3].settle = 1; // docked: excluded
    const links = transientLinks(config, dots);
    const pairs = links.map(({ first, second }) => `${first}-${second}`);
    expect(pairs).toContain('0-1');
    expect(pairs).toContain('0-2');
    expect(pairs.some((pair) => pair.includes('3'))).toBe(false);
    expect(links.length).toBeLessThanOrEqual(config.maxLinks);
    for (const { closeness } of links) {
      expect(closeness).toBeGreaterThan(0);
      expect(closeness).toBeLessThanOrEqual(1);
    }
  });
});

describe('ringLinkVisible', () => {
  test('welds only when both adjacent dots are fully docked (wrapping)', ({ expect }) => {
    const config = defaultSwarmConfig('linked');
    const dots = createDots(config, () => 0.5);
    dots.forEach((dot) => (dot.settle = 1));
    dots[1].settle = 0.9;
    expect(ringLinkVisible(dots, 0)).toBe(false); // 0–1: neighbour not fully docked
    expect(ringLinkVisible(dots, 1)).toBe(false); // 1–2
    expect(ringLinkVisible(dots, 2)).toBe(true); // 2–3
    expect(ringLinkVisible(dots, dots.length - 1)).toBe(true); // wraps to 0
  });
});
