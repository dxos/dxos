//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Hook from './Hook.ts';
import * as Operation from './Operation.ts';

const operation = Operation.make({
  meta: { key: DXN.make('com.example.operation.hook'), name: 'Hook' },
  input: Schema.Struct({}),
  output: Schema.Void,
});

const PLANNING_SKILL = 'com.example.skill.planning';

const anywhere: Hook.Definition = { key: 'com.example.hook.anywhere', event: 'end-request', operation };
const planning: Hook.Definition = {
  key: 'com.example.hook.planning',
  event: 'end-request',
  skill: PLANNING_SKILL,
  operation,
};
const catalog = [anywhere, planning];

const keys = (resolution: Hook.Resolution) => ({ ...resolution, run: resolution.run.map((hook) => hook.key) });

describe('Hook.resolve', () => {
  test('nothing runs unless a setting turns it on', ({ expect }) => {
    const resolution = Hook.resolve({ catalog, event: 'end-request', skillKeys: new Set([PLANNING_SKILL]) });
    expect(keys(resolution)).toEqual({ run: [], inactive: [], missing: [] });
  });

  test('instructions override the space key by key', ({ expect }) => {
    const resolution = Hook.resolve({
      catalog,
      event: 'end-request',
      space: { [anywhere.key]: true, [planning.key]: true },
      instructions: { [planning.key]: false },
      skillKeys: new Set([PLANNING_SKILL]),
    });
    expect(keys(resolution)).toEqual({ run: [anywhere.key], inactive: [], missing: [] });
  });

  test('an enabled hook whose skill is unbound is inactive, and one the host lacks is missing', ({ expect }) => {
    const resolution = Hook.resolve({
      catalog,
      event: 'end-request',
      space: { [planning.key]: true, 'com.example.hook.elsewhere': true },
      instructions: { [anywhere.key]: true },
      skillKeys: new Set(),
    });
    expect(keys(resolution)).toEqual({
      run: [anywhere.key],
      inactive: [planning.key],
      missing: ['com.example.hook.elsewhere'],
    });
  });
});
