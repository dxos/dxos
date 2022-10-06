//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { FractionUtil } from './fraction';

it('invalid', function () {
  expect(() => FractionUtil.validate([1, 0])).to.throw();
  expect(() => FractionUtil.validate([NaN, 1])).to.throw();
  expect(() => FractionUtil.validate([Infinity, 1])).to.throw();
  expect(() => FractionUtil.validate([1, NaN])).to.throw();
  expect(() => FractionUtil.validate([1, Infinity])).to.throw();
});

it('toNumber', function () {
  expect(FractionUtil.toNumber([9, 3])).to.equal(3);
  expect(FractionUtil.toNumber([Math.PI * 3, 6])).to.equal(Math.PI / 2);
});

it('round', function () {
  expect(FractionUtil.round([0, 1])).to.deep.equal([0, 1]);
  expect(FractionUtil.round([1, 3])).to.deep.equal([0, 1]);
  expect(FractionUtil.round([2, 3])).to.deep.equal([1, 1]);
  expect(FractionUtil.round([3, 4], 4)).to.deep.equal([3, 4]);
  expect(FractionUtil.round([7, 5], 4)).to.deep.equal([3, 2]); // 7/5 = 1.4 => 1.5 => 3/2
  expect(FractionUtil.round([1.75, 1], 4)).to.deep.equal([7, 4]);
});

it('factors', function () {
  expect(FractionUtil.factors(15)).to.deep.equal([1, 3, 5, 15]);
  expect(FractionUtil.factors(16)).to.deep.equal([1, 2, 4, 8, 16]);
  expect(FractionUtil.factors(20)).to.deep.equal([1, 2, 4, 5, 10, 20]);
  expect(FractionUtil.factors(8.5)).to.deep.equal([1]);
});

it('equals', function () {
  expect(FractionUtil.equals([0, 1], [0, 1])).to.be.true;
  expect(FractionUtil.equals([1, 3], [1, 3])).to.be.true;
  expect(FractionUtil.equals([2, 5], [4, 10])).to.be.true;
  expect(FractionUtil.equals([1, 3], [2, 3])).to.be.false;
  expect(FractionUtil.equals([0, 1], [1, 1])).to.be.false;
});

it('simplify', function () {
  expect(FractionUtil.simplify([0, 1])).to.deep.equal([0, 1]);
  expect(FractionUtil.simplify([3, 2])).to.deep.equal([3, 2]);
  expect(FractionUtil.simplify([8, 2])).to.deep.equal([4, 1]);
  expect(FractionUtil.simplify([9, 3])).to.deep.equal([3, 1]);
  expect(FractionUtil.simplify([4, 6])).to.deep.equal([2, 3]);
  expect(FractionUtil.simplify([8, 0.5])).to.deep.equal([16, 1]);
  expect(FractionUtil.simplify([8, 0.2])).to.deep.equal([40, 1]);
  expect(FractionUtil.simplify([6.3, 0.3])).to.deep.equal([21, 1]);
});

it('add', function () {
  expect(FractionUtil.add([1, 1], [0, 1])).to.deep.equal([1, 1]);
  expect(FractionUtil.add([4, 2], [8, 3])).to.deep.equal([14, 3]);
});

it('subtract', function () {
  expect(FractionUtil.subtract([1, 1], [0, 1])).to.deep.equal([1, 1]);
  expect(FractionUtil.subtract([4, 2], [8, 3])).to.deep.equal([-2, 3]);
});

it('multiply', function () {
  expect(FractionUtil.multiply([1, 1], [0, 1])).to.deep.equal([0, 1]);
  expect(FractionUtil.multiply([4, 2], [8, 3])).to.deep.equal([16, 3]);
});

it('divide', function () {
  expect(FractionUtil.divide([1, 1], [1, 1])).to.deep.equal([1, 1]);
  expect(FractionUtil.divide([4, 2], [8, 3])).to.deep.equal([3, 4]);
  expect(() => FractionUtil.divide([4, 2], [8, 0])).to.throw();
});
