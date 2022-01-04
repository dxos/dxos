//
// Copyright 2020 DXOS.org
//

import { Frac } from './fraction';

test('Normalize', () => {
  expect(Frac.norm([3, 2])).toEqual([3, 2]);
  expect(Frac.norm([3, 1])).toEqual([3, 1]);
  expect(Frac.norm([1, 2])).toEqual([1, 2]);
  expect(Frac.norm([8, 2])).toEqual([4, 1]);
  expect(Frac.norm([8, 0.5])).toEqual([16, 1]);
  expect(Frac.norm([8, 0.2])).toEqual([40, 1]);
});

test('Floor', () => {
  expect(Frac.float([1, 2])).toEqual(0.5);
  expect(Frac.float([10, 2])).toEqual(5);
});

test('Factors', () => {
  expect(Frac.factors(15)).toEqual([1, 3, 5, 15]);
  expect(Frac.factors(16)).toEqual([1, 2, 4, 8, 16]);
  expect(Frac.factors(20)).toEqual([1, 2, 4, 5, 10, 20]);
});

test.only('Norm', () => {
  expect(Frac.norm(Frac.num(1, 1))).toEqual([1, 1]);
  expect(Frac.norm(Frac.num(2, 7))).toEqual([2, 7]);
  expect(Frac.norm(Frac.num(9, 3))).toEqual([3, 1]);
  expect(Frac.norm(Frac.num(4, 6))).toEqual([2, 3]);
  expect(Frac.norm(Frac.num(6, 0.2))).toEqual([30, 1]);
  expect(Frac.norm(Frac.num(6.3, 0.3))).toEqual([21, 1]);
});

test('Float', () => {
  expect(Frac.float(Frac.num(9, 3))).toEqual(3);
  expect(Frac.float(Frac.num(Math.PI * 3, 6))).toEqual(Math.PI / 2);
});

test('Add', () => {
  const x = Frac.num(4, 2); // = 12/6 = 2
  const y = Frac.num(8, 3); // = 16/6
  const r = Frac.add(x, y); // = 28/6
  expect(r).toEqual([28, 6]);
});

test('Multiply', () => {
  const x = Frac.num(4, 2);
  const y = Frac.num(8, 2);
  const r = Frac.multiply(x, y);
  expect(Frac.floor(r)).toEqual(8);
});
