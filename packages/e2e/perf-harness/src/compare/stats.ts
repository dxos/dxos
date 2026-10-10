//
// Copyright 2026 DXOS.org
//

/** mulberry32: seeded so a verdict reproduces from the same samples. */
export const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const median = (values: ReadonlyArray<number>): number => {
  if (values.length === 0) {
    return Number.NaN;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const mean = (values: ReadonlyArray<number>): number =>
  values.reduce((total, value) => total + value, 0) / values.length;

/** ln Γ(x), Lanczos approximation; accurate to ~15 digits for x > 0. */
const logGamma = (x: number): number => {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905,
    -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  const shifted = x - 1;
  let sum = 0.99999999999980993;
  coefficients.forEach((coefficient, index) => {
    sum += coefficient / (shifted + index + 1);
  });
  const t = shifted + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(sum);
};

/** Regularized incomplete beta I_x(a, b), by Lentz's continued fraction. */
const incompleteBeta = (x: number, a: number, b: number): number => {
  if (x <= 0) {
    return 0;
  }
  if (x >= 1) {
    return 1;
  }
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - incompleteBeta(1 - x, b, a);
  }
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - (logGamma(a) + logGamma(b) - logGamma(a + b))) / a;
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  d = 1 / (Math.abs(d) < tiny ? tiny : d);
  let result = d;
  for (let m = 1; m <= 300; ++m) {
    for (const numerator of [
      (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m)),
      -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1)),
    ]) {
      d = 1 + numerator * d;
      d = 1 / (Math.abs(d) < tiny ? tiny : d);
      c = 1 + numerator / c;
      c = Math.abs(c) < tiny ? tiny : c;
      result *= d * c;
    }
    if (Math.abs(d * c - 1) < 1e-12) {
      break;
    }
  }
  return front * result;
};

/** P(T ≤ t) for Student's t with `df` degrees of freedom. */
const studentCdf = (t: number, df: number): number => {
  const tail = 0.5 * incompleteBeta(df / (df + t * t), df / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
};

/** The t with P(T ≤ t) = p, for p above one half; by bisection, since the CDF is monotone. */
export const studentQuantile = (p: number, df: number): number => {
  let low = 0;
  let high = 1;
  while (studentCdf(high, df) < p) {
    high *= 2;
  }
  for (let step = 0; step < 100; ++step) {
    const middle = (low + high) / 2;
    if (studentCdf(middle, df) < p) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return (low + high) / 2;
};

/**
 * Student-t confidence interval for the mean. Wide at small n, as it should be, yet a large effect
 * every round agrees on resolves in three to five rounds, where a rank-based interval cannot.
 */
export const tInterval = (values: ReadonlyArray<number>, confidence = 0.95): [number, number] => {
  if (values.length < 2) {
    return [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
  }
  const center = mean(values);
  const variance = values.reduce((total, value) => total + (value - center) ** 2, 0) / (values.length - 1);
  const margin = studentQuantile(1 - (1 - confidence) / 2, values.length - 1) * Math.sqrt(variance / values.length);
  return [center - margin, center + margin];
};

/**
 * Cliff's delta: P(candidate > base) − P(candidate < base), from −1 to 1. Rank-based, so a few slow
 * outlier rounds do not dominate it the way they would a difference of means.
 */
export const cliffsDelta = (base: ReadonlyArray<number>, candidate: ReadonlyArray<number>): number => {
  if (base.length === 0 || candidate.length === 0) {
    return Number.NaN;
  }
  let balance = 0;
  for (const right of candidate) {
    for (const left of base) {
      balance += Math.sign(right - left);
    }
  }
  return balance / (base.length * candidate.length);
};

/** Romano et al.'s threshold for a large effect. */
export const LARGE_CLIFFS_DELTA = 0.474;
