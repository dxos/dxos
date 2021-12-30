//
// Copyright 2020 DXOS.org
//

export type Num = [num: number, denum: number]

export class Frac {
  /**
   * Create fraction.
   * @param n
   * @param d
   */
  static num = (n: number, d: number = 1): Num => [n, d];

  /**
   * Convert to float number.
   * @param num
   * @param denum
   */
  static float = ([num, denum]: Num): number => num / denum;

  /**
   * Round down to integer.
   * @param num
   * @param denum
   * @param n
   */
  static floor = ([num, denum]: Num, n = 1): number => Math.floor(num * n / denum);

  /**
   * Normalize fraction.
   * @param n
   * @param d
   */
  static norm = ([n, d]: Num): Num => {
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
  static add = (n1: number | Num, n2: number | Num): Num => {
    const num1 = typeof n1 === 'number' ? Frac.num(n1) : n1;
    const num2 = typeof n2 === 'number' ? Frac.num(n2) : n2;

    const d = num1[1] * num2[1]; // Same denom.
    const n = (num1[0] * num2[1]) + (num2[0] * num1[1]);

    return Frac.norm([n, d]);
  }

  /**
   * Multiply fraction.
   * @param n1
   * @param n2
   */
  static x = (n1: number | Num, n2: number | Num): Num => {
    const num1 = typeof n1 === 'number' ? Frac.num(n1) : n1;
    const num2 = typeof n2 === 'number' ? Frac.num(n2) : n2;

    let n = num1[0] * num2[0];
    let d = num1[1] * num2[1];

    return Frac.norm([n, d]);
  }
}
