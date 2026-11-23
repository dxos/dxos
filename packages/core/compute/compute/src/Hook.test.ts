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
const PLANNING = 'com.example.plugin.planning';
const AUDIT = 'com.example.plugin.audit';

const [reminder] = Hook.forPlugin(PLANNING, [
  { key: 'com.example.hook.reminder', event: 'end-request', skill: PLANNING_SKILL, operation },
]);
const [audit] = Hook.forPlugin(AUDIT, [{ key: 'com.example.hook.audit', event: 'end-request', operation }]);
const catalog = [reminder, audit];

const resolve = (props: Partial<Parameters<typeof Hook.resolve>[0]>) => {
  const { run, ...rest } = Hook.resolve({ catalog, event: 'end-request', skillKeys: new Set(), ...props });
  return { run: run.map((hook) => hook.key), ...rest };
};

describe('Hook.resolve', () => {
  test("a plugin is on by default only if every one of its hooks names a skill, and then where it's bound", ({
    expect,
  }) => {
    expect(Hook.isOnByDefault(catalog, PLANNING)).toBe(true);
    expect(Hook.isOnByDefault(catalog, AUDIT)).toBe(false);
    expect(resolve({})).toEqual({ run: [], byDefault: [], inactive: [], missing: [] });
    expect(resolve({ skillKeys: new Set([PLANNING_SKILL]) })).toEqual({
      run: [reminder.key],
      byDefault: [reminder.key],
      inactive: [],
      missing: [],
    });
  });

  test('instructions override the space plugin by plugin', ({ expect }) => {
    expect(
      resolve({
        space: { [PLANNING]: false, [AUDIT]: true },
        instructions: { [PLANNING]: true },
        skillKeys: new Set([PLANNING_SKILL]),
      }),
    ).toEqual({ run: [reminder.key, audit.key], byDefault: [], inactive: [], missing: [] });
    expect(resolve({ space: { [AUDIT]: true }, instructions: { [AUDIT]: false } })).toEqual({
      run: [],
      byDefault: [],
      inactive: [],
      missing: [],
    });
  });

  test('a hook a setting turns on is inactive while its skill is unbound, and a plugin the host lacks is missing', ({
    expect,
  }) => {
    expect(resolve({ space: { [PLANNING]: true, 'com.example.plugin.elsewhere': true } })).toEqual({
      run: [],
      byDefault: [],
      inactive: [reminder.key],
      missing: ['com.example.plugin.elsewhere'],
    });
  });
});
