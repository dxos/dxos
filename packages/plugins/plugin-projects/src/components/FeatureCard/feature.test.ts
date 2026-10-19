//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type FeatureModel,
  getDependents,
  getFeatureIdParts,
  getFeatureRelation,
  getFeatureSignals,
  makeFeatureLookup,
} from './feature.ts';

const feature = (id: string, props: Partial<FeatureModel> = {}): FeatureModel => ({
  id,
  specKey: id.split('#')[0],
  specName: id.split('#')[0],
  key: id.split('#')[1],
  name: id,
  stage: 'preview',
  dependsOn: [],
  requirements: [],
  tasks: [],
  ...props,
});

describe('getFeatureSignals', () => {
  test('a planned dependency blocks and a less mature one overclaims', ({ expect }) => {
    const planned = feature('a#F-1', { stage: 'planned', tasks: [{ id: 't', title: 't', done: false }] });
    const preview = feature('a#F-2');
    const stable = feature('a#F-3', {
      stage: 'stable',
      dependsOn: [planned.id, preview.id],
      requirements: [{ key: 'F-3.1', text: 'x', covered: true }],
    });
    const lookup = makeFeatureLookup([planned, preview, stable]);
    expect(getFeatureSignals(stable, lookup)).toEqual(['blocked', 'overclaimed']);
    expect(getFeatureSignals(planned, lookup)).toEqual(['in-flight']);
  });

  test('a stable feature with no covered requirement is untested', ({ expect }) => {
    const stable = feature('a#F-1', { stage: 'stable', requirements: [{ key: 'F-1.1', text: 'x', covered: false }] });
    expect(getFeatureSignals(stable, makeFeatureLookup([stable]))).toEqual(['untested']);
  });

  test('a planned feature with no tasks is unplanned; an unknown dependency is reported', ({ expect }) => {
    const planned = feature('a#F-1', { stage: 'planned', dependsOn: ['b#F-9'] });
    expect(getFeatureSignals(planned, makeFeatureLookup([planned]))).toEqual(['missing-dependency', 'unplanned']);
  });
});

describe('relations', () => {
  test('dependencies and dependents of the selected feature', ({ expect }) => {
    const base = feature('a#F-1');
    const middle = feature('a#F-2', { dependsOn: [base.id] });
    const top = feature('b#F-1', { dependsOn: [middle.id] });
    const features = [base, middle, top];
    expect(getDependents(middle.id, features)).toEqual([top.id]);
    expect(getFeatureRelation(base, middle)).toBe('dependency');
    expect(getFeatureRelation(top, middle)).toBe('dependent');
    expect(getFeatureRelation(middle, middle)).toBeUndefined();
    expect(getFeatureRelation(top, base)).toBeUndefined();
  });
});

describe('getFeatureIdParts', () => {
  test('keeps the last spec key segment and the block key', ({ expect }) => {
    expect(getFeatureIdParts('org.dxos.plugin.agent#F-2')).toEqual({ spec: 'agent', key: 'F-2' });
    expect(getFeatureIdParts('local#F-1')).toEqual({ spec: 'local', key: 'F-1' });
  });
});
