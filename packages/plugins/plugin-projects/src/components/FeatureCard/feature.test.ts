//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type FeatureModel,
  buildFeatureModels,
  getDependents,
  getFeatureRelation,
  getFeatureSignals,
  makeFeatureLookup,
} from './feature.ts';

const feature = (id: string, props: Partial<FeatureModel> = {}): FeatureModel => ({
  id,
  name: id,
  status: 'prototype',
  active: false,
  requirements: [],
  specs: [],
  subfeatures: [],
  code: [],
  dependsOn: [],
  tasks: [],
  showcases: [],
  ...props,
});

describe('getFeatureSignals', () => {
  test('a planned or failing dependency blocks; operational ahead of a dependency without a showcase', ({ expect }) => {
    const failing = feature('a', { status: 'failing' });
    const top = feature('b', { status: 'operational', dependsOn: [failing.id] });
    expect(getFeatureSignals(top, makeFeatureLookup([failing, top]))).toEqual(['blocked', 'ahead', 'no-evidence']);
  });

  test('a planned feature with no tasks is unplanned', ({ expect }) => {
    const lookup = makeFeatureLookup([]);
    const task = { id: 't', title: 't', done: false, active: false };
    expect(getFeatureSignals(feature('a', { status: 'planned', tasks: [task] }), lookup)).toEqual([]);
    expect(getFeatureSignals(feature('b', { status: 'planned' }), lookup)).toEqual(['unplanned']);
  });

  test('a dependency outside the map is ignored', ({ expect }) => {
    const top = feature('a', { status: 'operational', dependsOn: ['elsewhere'], showcases: [{ id: 's', name: 's' }] });
    expect(getFeatureSignals(top, makeFeatureLookup([top]))).toEqual([]);
  });
});

describe('relations', () => {
  test('dependencies and dependents of the selected feature', ({ expect }) => {
    const base = feature('a');
    const middle = feature('b', { dependsOn: [base.id] });
    const top = feature('c', { dependsOn: [middle.id] });
    const features = [base, middle, top];
    expect(getDependents(middle.id, features)).toEqual([top.id]);
    expect(getFeatureRelation(base, middle)).toBe('dependency');
    expect(getFeatureRelation(top, middle)).toBe('dependent');
    expect(getFeatureRelation(middle, middle)).toBeUndefined();
    expect(getFeatureRelation(top, base)).toBeUndefined();
  });
});

describe('buildFeatureModels', () => {
  test('joins relations onto features in map order', ({ expect }) => {
    const models = buildFeatureModels({
      features: [
        { id: 'b', name: 'B', status: 'planned' },
        { id: 'a', name: 'A', status: 'operational', specs: ['x.mdl#F-1'] },
      ],
      children: [[{ id: 'c', name: 'C', status: 'planned' }, 'a']],
      dependsOn: [['b', 'a']],
      implementedBy: [[{ id: 't', title: 'T', done: false, active: true }, 'b']],
      showcasedBy: [[{ id: 's', name: 'S' }, 'a']],
    });
    expect(models.map((model) => model.id)).toEqual(['b', 'a']);
    expect(models[0]).toMatchObject({ active: true, dependsOn: ['a'], tasks: [{ id: 't' }], showcases: [], specs: [] });
    expect(models[1]).toMatchObject({
      active: false,
      dependsOn: [],
      showcases: [{ id: 's' }],
      specs: ['x.mdl#F-1'],
      subfeatures: [{ id: 'c', name: 'C', status: 'planned' }],
    });
  });
});
