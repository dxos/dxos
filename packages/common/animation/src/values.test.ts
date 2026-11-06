//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  eulerToQuaternion,
  interpolate,
  mixColor,
  oklabToRgb,
  parseHex,
  quaternionToEuler,
  rgbToOklab,
  valueKind,
} from './values.ts';

describe('valueKind', () => {
  test('infers the structural kinds; rotations and colours are never inferred', ({ expect }) => {
    expect(valueKind(1)).toBe('number');
    expect(valueKind({ x: 1, y: 2 })).toBe('point');
    expect(valueKind({ width: 1, height: 2 })).toBe('size');
    expect(valueKind({ x: 1, y: 2, z: 3 })).toBe('vec3');
    expect(valueKind('#ff0000')).toBe('discrete');
  });
});

describe('interpolate', () => {
  test('numbers, points and sizes, as before', ({ expect }) => {
    expect(interpolate(0, 10, 0.25)).toBe(2.5);
    expect(interpolate({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5)).toEqual({ x: 5, y: 10 });
    expect(interpolate({ width: 0, height: 0 }, { width: 10, height: 20 }, 0.5)).toEqual({ width: 5, height: 10 });
  });

  test('a vec3 per axis', ({ expect }) => {
    expect(interpolate({ x: 0, y: 0, z: 0 }, { x: 2, y: 4, z: 8 }, 0.5)).toEqual({ x: 1, y: 2, z: 4 });
  });

  test('discrete values and mismatched kinds hold until the end of the span', ({ expect }) => {
    expect(interpolate('a', 'b', 0.99)).toBe('a');
    expect(interpolate('a', 'b', 1)).toBe('b');
    expect(interpolate(1, { x: 1, y: 1 }, 0.5)).toBe(1);
  });

  test('a rotation by slerp: a turn about one axis goes half way at the midpoint', ({ expect }) => {
    const middle = interpolate({ x: 0, y: 0, z: 0 }, { x: 0, y: 90, z: 0 }, 0.5, 'rotation');
    expect(middle).toMatchObject({ x: expect.closeTo(0, 6), y: expect.closeTo(45, 6), z: expect.closeTo(0, 6) });
  });

  test('a rotation takes the shorter arc, unlike interpolating the angles', ({ expect }) => {
    const middle = interpolate({ x: 0, y: 170, z: 0 }, { x: 0, y: -170, z: 0 }, 0.5, 'rotation');
    const y = typeof middle === 'object' && middle !== null ? Number(Reflect.get(middle, 'y')) : NaN;
    expect(Math.abs(Math.abs(y) - 180)).toBeLessThan(1e-6);
    expect(interpolate({ x: 0, y: 170, z: 0 }, { x: 0, y: -170, z: 0 }, 0.5, 'vec3')).toEqual({ x: 0, y: 0, z: 0 });
  });

  test('the ends of a rotation are the keys as written', ({ expect }) => {
    const to = { x: 10, y: 400, z: -20 };
    expect(interpolate({ x: 0, y: 0, z: 0 }, to, 1, 'rotation')).toBe(to);
  });

  test('a colour in OKLab: the midpoint has the mean lightness, brighter than an sRGB mix', ({ expect }) => {
    const middle = parseHex(String(interpolate('#ff0000', '#0000ff', 0.5, 'color')));
    const lightness = (hex: string) => rgbToOklab(parseHex(hex) ?? { r: 0, g: 0, b: 0, a: 1 }).l;
    expect(middle).toBeDefined();
    const { l } = rgbToOklab(middle ?? { r: 0, g: 0, b: 0, a: 1 });
    expect(l).toBeCloseTo((lightness('#ff0000') + lightness('#0000ff')) / 2, 2);
    expect(l).toBeGreaterThan(lightness('#800080'));
  });

  test('colours accept short and alpha hex, and hold anything else', ({ expect }) => {
    expect(interpolate('#000', '#fff', 0, 'color')).toBe('#000');
    expect(interpolate('#000', '#fff', 1, 'color')).toBe('#fff');
    expect(mixColor('#00000000', '#000000ff', 0.5)).toBe('#00000080');
    expect(interpolate('red', '#fff', 0.5, 'color')).toBe('red');
  });
});

describe('colour space', () => {
  test('sRGB round-trips through OKLab', ({ expect }) => {
    const colour = { r: 0.2, g: 0.6, b: 0.9, a: 1 };
    const back = oklabToRgb(rgbToOklab(colour));
    expect(back.r).toBeCloseTo(colour.r, 6);
    expect(back.g).toBeCloseTo(colour.g, 6);
    expect(back.b).toBeCloseTo(colour.b, 6);
  });
});

describe('rotation', () => {
  test('Euler degrees round-trip through a quaternion', ({ expect }) => {
    for (const angles of [
      { x: 10, y: 20, z: 30 },
      { x: -45, y: 120, z: 5 },
      { x: 0, y: -90, z: 60 },
    ]) {
      const back = quaternionToEuler(eulerToQuaternion(angles));
      expect(back.x).toBeCloseTo(angles.x, 6);
      expect(back.y).toBeCloseTo(angles.y, 6);
      expect(back.z).toBeCloseTo(angles.z, 6);
    }
  });
});
