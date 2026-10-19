//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type FeatureModel,
  buildFeatureModels,
  findDependencyCycle,
  getDependents,
  getFeatureRelation,
  getFeatureSignals,
  makeFeatureLookup,
} from './feature.ts';

const feature = (id: string, props: Partial<FeatureModel> = {}): FeatureModel => ({
  id,
  name: id,
  status: 'prototype',
  specs: [],
  subfeatures: [],
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

  test('open tasks are in flight; a planned feature with none is unplanned', ({ expect }) => {
    const lookup = makeFeatureLookup([]);
    expect(getFeatureSignals(feature('a', { tasks: [{ id: 't', title: 't', done: false }] }), lookup)).toEqual([
      'in-flight',
    ]);
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

  test('an edge that would close a cycle is found with its path', ({ expect }) => {
    const edges = [
      ['a', 'b'],
      ['b', 'c'],
    ] as const;
    expect(findDependencyCycle(edges, 'c', 'a')).toEqual(['a', 'b', 'c']);
    expect(findDependencyCycle(edges, 'a', 'c')).toBeUndefined();
    expect(findDependencyCycle(edges, 'a', 'a')).toEqual(['a']);
  });
});

describe('buildFeatureModels', () => {
  test('joins relations onto features in map order', ({ expect }) => {
    const models = buildFeatureModels({
      features: [
        { id: 'b', name: 'B', status: 'planned', subfeatures: [] },
        { id: 'a', name: 'A', status: 'operational', specs: ['x.mdl#F-1'], subfeatures: [] },
      ],
      dependsOn: [['b', 'a']],
      implementedBy: [[{ id: 't', title: 'T', done: false }, 'b']],
      showcasedBy: [[{ id: 's', name: 'S' }, 'a']],
    });
    expect(models.map((model) => model.id)).toEqual(['b', 'a']);
    expect(models[0]).toMatchObject({ dependsOn: ['a'], tasks: [{ id: 't' }], showcases: [], specs: [] });
    expect(models[1]).toMatchObject({ dependsOn: [], showcases: [{ id: 's' }], specs: ['x.mdl#F-1'] });
  });
});
