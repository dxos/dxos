//
// Copyright 2020 DXOS.org
//

import expectExport from 'expect';
import { FractionUtil } from './fraction';

test('invalid', () => {
  expect(() => FractionUtil.validate([1, 0])).toThrow();
  expect(() => FractionUtil.validate([NaN, 1])).toThrow();
  expect(() => FractionUtil.validate([Infinity, 1])).toThrow();
  expect(() => FractionUtil.validate([1, NaN])).toThrow();
  expect(() => FractionUtil.validate([1, Infinity])).toThrow();
});

test('toNumber', () => {
  expect(FractionUtil.toNumber([9, 3])).toEqual(3);
  expect(FractionUtil.toNumber([Math.PI * 3, 6])).toEqual(Math.PI / 2);
});

test('round', () => {
  expect(FractionUtil.round([0, 1])).toEqual([0, 1]);
  expect(FractionUtil.round([1, 3])).toEqual([0, 1]);
  expect(FractionUtil.round([2, 3])).toEqual([1, 1]);
  expect(FractionUtil.round([3, 4], 4)).toEqual([3, 4]);
  expect(FractionUtil.round([7, 5], 4)).toEqual([3, 2]); // 7/5 = 1.4 => 1.5 => 3/2
  expect(FractionUtil.round([1.75, 1], 4)).toEqual([7, 4]);
});

test('factors', () => {
  expect(FractionUtil.factors(15)).toEqual([1, 3, 5, 15]);
  expect(FractionUtil.factors(16)).toEqual([1, 2, 4, 8, 16]);
  expect(FractionUtil.factors(20)).toEqual([1, 2, 4, 5, 10, 20]);
  expect(FractionUtil.factors(8.5)).toEqual([1]);
});

test('equals', () => {
  expect(FractionUtil.equals([0, 1], [0, 1])).toBeTruthy();
  expect(FractionUtil.equals([1, 3], [1, 3])).toBeTruthy();
  expect(FractionUtil.equals([2, 5], [4, 10])).toBeTruthy();
  expect(FractionUtil.equals([1, 3], [2, 3])).toBeFalsy();
  expect(FractionUtil.equals([0, 1], [1, 1])).toBeFalsy();
})

test('simplify', () => {
  expect(FractionUtil.simplify([0, 1])).toEqual([0, 1]);
  expect(FractionUtil.simplify([3, 2])).toEqual([3, 2]);
  expect(FractionUtil.simplify([8, 2])).toEqual([4, 1]);
  expect(FractionUtil.simplify([9, 3])).toEqual([3, 1]);
  expect(FractionUtil.simplify([4, 6])).toEqual([2, 3]);
  expect(FractionUtil.simplify([8, 0.5])).toEqual([16, 1]);
  expect(FractionUtil.simplify([8, 0.2])).toEqual([40, 1]);
  expect(FractionUtil.simplify([6.3, 0.3])).toEqual([21, 1]);
});

test('add', () => {
  expect(FractionUtil.add([1, 1], [0, 1])).toEqual([1, 1]);
  expect(FractionUtil.add([4, 2], [8, 3])).toEqual([14, 3]);
});

test('subtract', () => {
  expect(FractionUtil.subtract([1, 1], [0, 1])).toEqual([1, 1]);
  expect(FractionUtil.subtract([4, 2], [8, 3])).toEqual([-2, 3]);
});

test('multiply', () => {
  expect(FractionUtil.multiply([1, 1], [0, 1])).toEqual([0, 1]);
  expect(FractionUtil.multiply([4, 2], [8, 3])).toEqual([16, 3]);
});

test('divide', () => {
  expect(FractionUtil.divide([1, 1], [1, 1])).toEqual([1, 1]);
  expect(FractionUtil.divide([4, 2], [8, 3])).toEqual([3, 4]);
  expect(() => FractionUtil.divide([4, 2], [8, 0])).toThrow();
});
