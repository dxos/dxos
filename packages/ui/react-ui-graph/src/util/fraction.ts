//
// Copyright 2020 DXOS.org
//

import { invariant } from '@dxos/invariant';

// TODO(burdon): Protobuf mapping?
export type Fraction = [num: number, denum: number];

export type Num = number | Fraction;

export class FractionUtil {
  /**
   * Convert number to fraction.
   * @param n
   */
  static toFraction = (n: Num): Fraction => (typeof n === 'number' ? [n, 1] : n);

  static validate = (...fraction: Fraction[]): Fraction[] => {
    fraction.forEach(([n, d]) => {
      if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) {
        throw new Error(`Invalid fraction: ${n}/${d}`);
      }
    });

    return fraction;
  };

  /**
   * @param {Fraction}
   * Convert to rounded number.
   */
  static toNumber = ([n, d]: Fraction): number => {
    FractionUtil.validate([n, d]);
    return n / d;
  };

  /**
   * Round the number to the nearest fraction.
   * Example: 3/5 => 1/1; 3/5 (precision 2) => 1/2.
   * @param {Fraction}
   * @param p Precision (e.g., 1/2, 1/4, etc.)
   */
  static round = ([n, d]: Fraction, p = 1): Fraction => {
    FractionUtil.validate([n, d]);
    const v = Math.round(FractionUtil.toNumber(FractionUtil.divide([n, d], [1, p])));
    return FractionUtil.simplify([v, p]);
  };

  //
  // Boolean.
  //

  /**
   * Tests if equals.
   * @param n1
   * @param n2
   */
  static equals = (n1: Fraction, n2: Fraction) => n1[0] * n2[1] === n1[1] * n2[0];

  /**
   * @param {Fraction}
   * True if zero.
   */
  static isZero = ([n]: Fraction): boolean => n === 0;

  //
  // Normalization.
  //

  /**
   * Simplify fraction finding LCDs.
   * @param n
   * @param d
   */
  static simplify = ([n, d]: Fraction): Fraction => {
    FractionUtil.validate([n, d]);
    if (d < 1) {
      const t = n / d;
      if (Math.floor(t) === t) {
        n = t;
        d = 1;
      }
    }

    // Find highest common denominator.
    const fn = FractionUtil.factors(n).reverse();
    const fd = FractionUtil.factors(d).reverse();

    let c;
    for (let i = 0; i < fn.length; i++) {
      c = fd.find((n) => n === fn[i]);
      if (c) {
        return [n / c, d / c];
      }
    }

    // TODO(burdon): Convert to number if d == 1.
    return [n, d];
  };

  /**
   * Return common factors.
   * @param n
   */
  static factors = (n: number): number[] => {
    invariant(Number.isFinite(n), `Invalid number: ${n}`);

    const factors = [1];
    if (Number.isSafeInteger(n)) {
      let f = 1;
      do {
        if (n % ++f === 0) {
          factors.push(f);
        }
      } while (n / f > 1 && f < 100);
    }

    return factors;
  };

  //
  // Basic arithmetic.
  //

  /**
   * @param n1
   * @param n2
   */
  static add = (n1: Fraction, n2: Fraction): Fraction => {
    FractionUtil.validate(n1, n2);
    const d = n1[1] * n2[1]; // Same denom.
    const n = n1[0] * n2[1] + n2[0] * n1[1];
    return FractionUtil.simplify([n, d]);
  };

  /**
   * @param n1
   * @param n2
   */
  static subtract = (n1: Fraction, n2: Fraction): Fraction => {
    FractionUtil.validate(n1, n2);
    const d = n1[1] * n2[1]; // Same denom.
    const n = n1[0] * n2[1] - n2[0] * n1[1];
    return FractionUtil.simplify([n, d]);
  };

  /**
   * @param n1
   * @param n2
   */
  static multiply = (n1: Fraction, n2: Fraction): Fraction => {
    FractionUtil.validate(n1, n2);
    const n = n1[0] * n2[0];
    const d = n1[1] * n2[1];
    return FractionUtil.simplify([n, d]);
  };

  /**
   * @param n1
   * @param n2
   */
  static divide = (n1: Fraction, n2: Fraction): Fraction => {
    FractionUtil.validate(n1, n2);
    const n = n1[0] * n2[1];
    const d = n1[1] * n2[0];
    return FractionUtil.simplify([n, d]);
  };
}
