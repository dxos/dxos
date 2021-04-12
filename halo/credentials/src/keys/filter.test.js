//
// Copyright 2020 DXOS.org
//

import { Filter } from './filter';

const values = [
  { x: 100, z: true },
  { x: 200 },
  { y: 'apple', z: true },
  { z: true },
  { z: false }
];

test('Basic filter', () => {
  expect(Filter.filter(values, Filter.matches({ z: true }))).toHaveLength(3);
  expect(Filter.filter(values, Filter.hasProperty('x'))).toHaveLength(2);
  expect(Filter.filter(values, Filter.propertyIn('x', [100, 200]))).toHaveLength(2);
  expect(Filter.filter(values, Filter.and(
    Filter.hasProperty('x'),
    Filter.not(Filter.propertyIn('x', [100]))
  ))).toHaveLength(1);
});

test('Basic AND filter', () => {
  expect(Filter.filter(values, Filter.and(
    Filter.matches({ z: true }),
    Filter.hasProperty('y'))
  ))
    .toHaveLength(1);
});
