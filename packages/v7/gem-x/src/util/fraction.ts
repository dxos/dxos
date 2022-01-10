//
// Copyright 2020 DXOS.org
//

export type Fraction = [num: number, denum: number]

export type Num = number | Fraction

export type Point2 = [x: Num, y: Num]

export type Bounds2 = { x: Num, y: Num, width: Num, height: Num } // TODO(burdon): Array.

// TODO(burdon): Rename.
export class Frac {
  /**
   * Create fraction.
   * @param n
   */
  static fraction = (n: Num): Fraction => {
    return typeof n === 'number' ? [n, 1] : n;
  }

  /**
   * @param n
   */
  static isZero = (n: Num): boolean => {
    return typeof n === 'number' ? n === 0 : n[0] === 0;
  }

  /**
   * Check valid fraction.
   * @param n
   * @param d
   */
  static validate = ([n, d]: Fraction): Fraction => {
    if (!(d !== 0 && Number.isInteger(n) && Number.isInteger(d))) {
      throw new Error(`Invalid fraction: ${n}/${d}`);
    }

    return [n, d];
  }

  /**
   * Calculate center point.
   * @param bounds
   */
  // TODO(burdon): Mirror center, bounds, for Num, number, etc.
  static center = ({ x, y, width, height }: Bounds2): Point2 => {
    const cx = Frac.add(x, Frac.multiply(width, [1, 2]));
    const cy = Frac.add(y, Frac.multiply(height, [1, 2]));
    return [cx, cy];
  }

  /**
   * Convert to float number.
   * @param num
   * @param denum
   */
  static float = ([num, denum]: Fraction): number => num / denum;

  /**
   * Round down to integer.
   * @param num
   * @param denum
   * @param n
   */
  static floor = ([num, denum]: Fraction, n = 1): number => Math.floor(num * n / denum);

  /**
   * Round the number to the nearest fraction.
   * @param n Value
   * @param d Precision (e.g., 1/2, 1/4, etc.)
   */
  static round = (n: number, d = 1): Fraction => {
    const f: Fraction = [Math.round(n * d), d];
    return (d > 1) ? Frac.norm(f) : f;
  };

  /**
   * Normalize fraction finding LCDs.
   * @param n
   * @param d
   */
  // TODO(burdon): Rename normalize.
  static norm = ([n, d]: Fraction): Fraction => {
    if (d < 1) {
      const t = n / d;
      if (Math.floor(t) === t) {
        n = t;
        d = 1;
      }
    }

    // Find highest common denominator.
    const fn = Frac.factors(n).reverse();
    const fd = Frac.factors(d).reverse();

    let c;
    for (let i = 0; i < fn.length; i++) {
      c = fd.find(n => n === fn[i]);
      if (c) {
        return [n / c, d / c];
      }
    }

    return [n, d];
  }

  /**
   * Return common factors.
   * @param n
   */
  static factors = (n: number): number[] => {
    const factors = [1];
    let f = 1;
    do {
      if (n % ++f === 0) {
        factors.push(f);
      }
    } while (n / f > 1);

    return factors;
  }

  /**
   * Add fraction.
   * @param n1
   * @param n2
   */
  static add = (n1: Num, n2: Num): Fraction => {
    const num1 = Frac.fraction(n1);
    const num2 = Frac.fraction(n2);

    const d = num1[1] * num2[1]; // Same denom.
    const n = (num1[0] * num2[1]) + (num2[0] * num1[1]);

    return Frac.norm([n, d]);
  }

  /**
   * Subtract fraction.
   * @param n1
   * @param n2
   */
  static sub = (n1: Num, n2: Num): Fraction => {
    const num1 = Frac.fraction(n1);
    const num2 = Frac.fraction(n2);

    const d = num1[1] * num2[1]; // Same denom.
    const n = (num1[0] * num2[1]) - (num2[0] * num1[1]);

    return Frac.norm([n, d]);
  }

  /**
   * Multiply fraction.
   * @param n1
   * @param n2
   */
  static multiply = (n1: Num, n2: Num): Fraction => {
    const num1 = Frac.fraction(n1);
    const num2 = Frac.fraction(n2);

    const n = num1[0] * num2[0];
    const d = num1[1] * num2[1];

    return Frac.norm([n, d]);
  }
}
