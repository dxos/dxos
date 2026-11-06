//
// Copyright 2026 DXOS.org
//

//
// Value kinds and their interpolators (plugin-animator DESIGN.md §5.2).
//

import { type AnimatableKind, type Vec3 } from './types.ts';
import { isRecord } from './util.ts';

const isNumberField = (value: Record<string, unknown>, key: string) => typeof value[key] === 'number';

const isVec3 = (value: unknown): value is Vec3 =>
  isRecord(value) && isNumberField(value, 'x') && isNumberField(value, 'y') && isNumberField(value, 'z');

/**
 * The kind of a value as stored, which picks how it is interpolated when its track names none. A rotation and a
 * colour look like a `vec3` and a string, so they are never inferred: their track or schema says so.
 */
export const valueKind = (value: unknown): AnimatableKind => {
  if (typeof value === 'number') {
    return 'number';
  }
  if (isVec3(value)) {
    return 'vec3';
  }
  if (isRecord(value) && isNumberField(value, 'x') && isNumberField(value, 'y')) {
    return 'point';
  }
  if (isRecord(value) && isNumberField(value, 'width') && isNumberField(value, 'height')) {
    return 'size';
  }
  return 'discrete';
};

export const lerp = (from: number, to: number, amount: number): number => from + (to - from) * amount;

const hold = (from: unknown, to: unknown, amount: number) => (amount < 1 ? from : to);

/**
 * The value `amount` of the way from `from` to `to`. `kind` is the property's declared kind; unset, it is inferred from
 * the values (`valueKind`). Values that do not fit the kind are held, switching at the end of the span.
 */
export const interpolate = (from: unknown, to: unknown, amount: number, kind?: AnimatableKind): unknown => {
  const resolved = kind ?? valueKind(from);
  if (kind === undefined && resolved !== valueKind(to)) {
    return hold(from, to, amount);
  }
  switch (resolved) {
    case 'number':
      return typeof from === 'number' && typeof to === 'number' ? lerp(from, to, amount) : hold(from, to, amount);
    case 'point':
      return isRecord(from) && isRecord(to)
        ? { x: lerp(Number(from.x), Number(to.x), amount), y: lerp(Number(from.y), Number(to.y), amount) }
        : hold(from, to, amount);
    case 'size':
      return isRecord(from) && isRecord(to)
        ? {
            width: lerp(Number(from.width), Number(to.width), amount),
            height: lerp(Number(from.height), Number(to.height), amount),
          }
        : hold(from, to, amount);
    case 'vec3':
      return isVec3(from) && isVec3(to)
        ? { x: lerp(from.x, to.x, amount), y: lerp(from.y, to.y, amount), z: lerp(from.z, to.z, amount) }
        : hold(from, to, amount);
    case 'rotation':
      return isVec3(from) && isVec3(to) ? slerpEuler(from, to, amount) : hold(from, to, amount);
    case 'color':
      return typeof from === 'string' && typeof to === 'string' ? mixColor(from, to, amount) : hold(from, to, amount);
    case 'discrete':
      return hold(from, to, amount);
  }
};

//
// Rotation: Euler degrees applied yaw (y), pitch (x), roll (z), the order Babylon.js applies a node's rotation in.
//

export type Quaternion = { x: number; y: number; z: number; w: number };

const RADIANS = Math.PI / 180;

/** The quaternion of a rotation given as Euler degrees. */
export const eulerToQuaternion = ({ x, y, z }: Vec3): Quaternion => {
  const [halfPitch, halfYaw, halfRoll] = [x * RADIANS * 0.5, y * RADIANS * 0.5, z * RADIANS * 0.5];
  const [sinPitch, cosPitch] = [Math.sin(halfPitch), Math.cos(halfPitch)];
  const [sinYaw, cosYaw] = [Math.sin(halfYaw), Math.cos(halfYaw)];
  const [sinRoll, cosRoll] = [Math.sin(halfRoll), Math.cos(halfRoll)];
  return {
    x: cosYaw * sinPitch * cosRoll + sinYaw * cosPitch * sinRoll,
    y: sinYaw * cosPitch * cosRoll - cosYaw * sinPitch * sinRoll,
    z: cosYaw * cosPitch * sinRoll - sinYaw * sinPitch * cosRoll,
    w: cosYaw * cosPitch * cosRoll + sinYaw * sinPitch * sinRoll,
  };
};

/** The Euler degrees of a unit quaternion; at gimbal lock the roll is folded into the yaw. */
export const quaternionToEuler = ({ x, y, z, w }: Quaternion): Vec3 => {
  const zAxisY = y * z - x * w;
  const limit = 0.4999999;
  if (Math.abs(zAxisY) > limit) {
    return { x: zAxisY < 0 ? 90 : -90, y: (2 * Math.atan2(y, w)) / RADIANS, z: 0 };
  }
  return {
    x: Math.asin(-2 * zAxisY) / RADIANS,
    y: Math.atan2(2 * (z * x + y * w), z * z - x * x - y * y + w * w) / RADIANS,
    z: Math.atan2(2 * (x * y + z * w), -z * z - x * x + y * y + w * w) / RADIANS,
  };
};

/** Spherical interpolation along the shorter arc. */
export const slerp = (from: Quaternion, to: Quaternion, amount: number): Quaternion => {
  let cos = from.x * to.x + from.y * to.y + from.z * to.z + from.w * to.w;
  const sign = cos < 0 ? -1 : 1;
  cos *= sign;
  let fromWeight = 1 - amount;
  let toWeight = amount * sign;
  // Nearly the same orientation: the arc is a line, and its sine would divide by almost zero.
  if (cos < 0.9999) {
    const angle = Math.acos(cos);
    const sin = Math.sin(angle);
    fromWeight = Math.sin((1 - amount) * angle) / sin;
    toWeight = (Math.sin(amount * angle) / sin) * sign;
  }
  const result = {
    x: from.x * fromWeight + to.x * toWeight,
    y: from.y * fromWeight + to.y * toWeight,
    z: from.z * fromWeight + to.z * toWeight,
    w: from.w * fromWeight + to.w * toWeight,
  };
  const length = Math.hypot(result.x, result.y, result.z, result.w) || 1;
  return { x: result.x / length, y: result.y / length, z: result.z / length, w: result.w / length };
};

/** The rotation `amount` of the way between two Euler rotations; the ends are returned as given. */
const slerpEuler = (from: Vec3, to: Vec3, amount: number): Vec3 => {
  if (amount <= 0) {
    return from;
  }
  if (amount >= 1) {
    return to;
  }
  return quaternionToEuler(slerp(eulerToQuaternion(from), eulerToQuaternion(to), amount));
};

//
// Colour: hex strings mixed in OKLab, where equal steps look equal and a midpoint keeps its chroma.
//

/** sRGB channels and alpha, each 0 to 1. */
export type Rgba = { r: number; g: number; b: number; a: number };

/** `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa` as channels; undefined for anything else. */
export const parseHex = (text: string): Rgba | undefined => {
  const match = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(text.trim());
  if (!match) {
    return undefined;
  }
  const digits = match[1].length <= 4 ? [...match[1]].map((digit) => digit + digit).join('') : match[1];
  const channel = (index: number) => parseInt(digits.slice(index * 2, index * 2 + 2), 16) / 255;
  return { r: channel(0), g: channel(1), b: channel(2), a: digits.length === 8 ? channel(3) : 1 };
};

/** Channels as `#rrggbb`, or `#rrggbbaa` when not opaque. */
export const formatHex = ({ r, g, b, a }: Rgba): string => {
  const hex = (value: number) =>
    Math.round(Math.min(1, Math.max(0, value)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}${a < 1 ? hex(a) : ''}`;
};

const toLinear = (value: number) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const fromLinear = (value: number) => (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055);

export type Oklab = { l: number; a: number; b: number };

/** sRGB to OKLab (Björn Ottosson's matrices). */
export const rgbToOklab = ({ r, g, b }: Rgba): Oklab => {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
};

/** OKLab to sRGB, with an alpha. */
export const oklabToRgb = ({ l, a, b }: Oklab, alpha = 1): Rgba => {
  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: fromLinear(4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp),
    g: fromLinear(-1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp),
    b: fromLinear(-0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp),
    a: alpha,
  };
};

/** Two hex colours mixed in OKLab; anything that is not a hex colour is held. */
export const mixColor = (from: string, to: string, amount: number): string => {
  const start = parseHex(from);
  const end = parseHex(to);
  if (!start || !end) {
    return amount < 1 ? from : to;
  }
  if (amount <= 0) {
    return from;
  }
  if (amount >= 1) {
    return to;
  }
  const [left, right] = [rgbToOklab(start), rgbToOklab(end)];
  return formatHex(
    oklabToRgb(
      { l: lerp(left.l, right.l, amount), a: lerp(left.a, right.a, amount), b: lerp(left.b, right.b, amount) },
      lerp(start.a, end.a, amount),
    ),
  );
};
