//
// Copyright 2020 DXOS.org
//

// TODO(burdon): https://www.npmjs.com/package/mathjs (https://mathjs.org/docs/datatypes/fractions.html)

type Fraction = [number, number, number?];

// Returns a floating point number.
export const fractionToDecimal = ([num, denom]: Fraction): number => num / denom;

export const fraction = (num: number, denom = 1): Fraction => {
  return [num, denom, fractionToDecimal([num, denom])];
};

export const multiply = ([n1, d1]: Fraction, [n2, d2]: Fraction): Fraction => {
  const numerator = n1 * n2;
  const denominator = d1 * d2;
  return [numerator, denominator, fractionToDecimal([numerator, denominator])];
};
