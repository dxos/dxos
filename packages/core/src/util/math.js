//
// Copyright 2020 DxOS
//

// TODO(burdon): https://www.npmjs.com/package/mathjs (https://mathjs.org/docs/datatypes/fractions.html)

export const fractionToDecimal = ([num, denom]) => num/denom;

export const fraction = (num, denom = 1) => {
  return [num, denom, fractionToDecimal([num, denom])];
};

export const multiply = ([n1, d1], [n2, d2]) => {
  const num = n1 * n2;
  const denom = d1 * d2;
  return [num, denom, fractionToDecimal([num, denom])];
};
