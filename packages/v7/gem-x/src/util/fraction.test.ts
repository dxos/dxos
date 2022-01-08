//
// Copyright 2020 DXOS.org
//

import { Frac } from './fraction';

test('norm', () => {
  expect(Frac.norm([3, 2])).toEqual([3, 2]);
  expect(Frac.norm([3, 1])).toEqual([3, 1]);
  expect(Frac.norm([1, 2])).toEqual([1, 2]);
  expect(Frac.norm([8, 2])).toEqual([4, 1]);
  expect(Frac.norm([8, 0.5])).toEqual([16, 1]);
  expect(Frac.norm([8, 0.2])).toEqual([40, 1]);

  expect(Frac.norm([1, 1])).toEqual([1, 1]);
  expect(Frac.norm([2, 7])).toEqual([2, 7]);
  expect(Frac.norm([9, 3])).toEqual([3, 1]);
  expect(Frac.norm([4, 6])).toEqual([2, 3]);
  expect(Frac.norm([6, 0.2])).toEqual([30, 1]);
  expect(Frac.norm([6.3, 0.3])).toEqual([21, 1]);
});

test('floor', () => {
  expect(Frac.floor([1, 2])).toEqual(0);
  expect(Frac.floor([1, 3])).toEqual(0);
  expect(Frac.floor([2, 3])).toEqual(0);
  expect(Frac.floor([10, 2])).toEqual(5);
});

test('float', () => {
  expect(Frac.float([9, 3])).toEqual(3);
  expect(Frac.float([Math.PI * 3, 6])).toEqual(Math.PI / 2);
});

test('factors', () => {
  expect(Frac.factors(15)).toEqual([1, 3, 5, 15]);
  expect(Frac.factors(16)).toEqual([1, 2, 4, 8, 16]);
  expect(Frac.factors(20)).toEqual([1, 2, 4, 5, 10, 20]);
});

test('add', () => {
  expect(Frac.add([1, 1], 0)).toEqual([1, 1]);
  expect(Frac.add([4, 2], [8, 3])).toEqual([14, 3]);
});

test('multiply', () => {
  expect(Frac.floor(Frac.multiply([4, 2], [8, 2]))).toEqual(8);
});

test('round', () => {

});
