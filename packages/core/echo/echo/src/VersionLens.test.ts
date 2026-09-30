//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Type from './Type.ts';
import * as VersionLens from './VersionLens.ts';

const TaskV1 = Type.makeObject(DXN.make('org.dxos.test.task', '0.1.0'))(
  Schema.Struct({ title: Schema.String, notes: Schema.optional(Schema.String) }),
);

const TaskV2 = Type.makeObject(DXN.make('org.dxos.test.task', '0.2.0'))(
  Schema.Struct({ name: Schema.String, notes: Schema.optional(Schema.String), done: Schema.Boolean }),
);

const TaskV3 = Type.makeObject(DXN.make('org.dxos.test.task', '0.3.0'))(
  Schema.Struct({ name: Schema.String, done: Schema.Boolean }),
);

const v1v2 = VersionLens.make({
  from: TaskV1,
  to: TaskV2,
  ops: [VersionLens.rename('title', 'name'), VersionLens.add('done', false)],
});

const v2v3 = VersionLens.make({ from: TaskV2, to: TaskV3, ops: [VersionLens.remove('notes', '')] });

describe('VersionLens', () => {
  test('forward and backward are inverse for data both versions can hold', () => {
    const v1 = { title: 'Plan', notes: 'soon' };
    expect(v1v2.forward(v1)).toEqual({ name: 'Plan', notes: 'soon', done: false });
    expect(v1v2.backward(v1v2.forward(v1))).toEqual(v1);
    expect(v2v3.backward({ name: 'Plan', done: true })).toEqual({ name: 'Plan', done: true, notes: '' });
  });

  test('an added property keeps a value the object already has', () => {
    expect(v1v2.forward({ title: 'Plan', done: true })).toEqual({ name: 'Plan', done: true });
  });

  test('defaults are not shared between results', () => {
    const lens = VersionLens.make({ from: TaskV1, to: TaskV2, ops: [VersionLens.add('tags', [])] });
    const one = lens.forward({});
    const two = lens.forward({});
    expect(one.tags).not.toBe(two.tags);
  });

  test('a path composes lenses in either direction', () => {
    const lenses = [v2v3, v1v2];
    const up = VersionLens.findPath(lenses, 'org.dxos.test.task', '0.1.0', '0.3.0');
    const down = VersionLens.findPath(lenses, 'org.dxos.test.task', '0.3.0', '0.1.0');
    expect(up?.keys).toEqual([v1v2.key, v2v3.key]);
    expect(up?.apply({ title: 'Plan', notes: 'soon' })).toEqual({ name: 'Plan', done: false });
    expect(down?.apply({ name: 'Plan', done: true })).toEqual({ title: 'Plan', notes: '' });
    expect(VersionLens.findPath([v1v2], 'org.dxos.test.task', '0.1.0', '0.3.0')).toBeUndefined();
    expect(VersionLens.versionsOf(lenses, 'org.dxos.test.task')).toEqual(['0.1.0', '0.2.0', '0.3.0']);
  });

  test('a lens connects an older version of one type to a newer one', () => {
    const Other = Type.makeObject(DXN.make('org.dxos.test.other', '0.2.0'))(Schema.Struct({}));
    expect(() => VersionLens.make({ from: TaskV1, to: Other, ops: [] })).toThrow(/not versions of one type/);
    expect(() => VersionLens.make({ from: TaskV2, to: TaskV1, ops: [] })).toThrow(/not older/);
  });

  test('versions compare numerically', () => {
    expect(VersionLens.compareVersions('0.10.0', '0.9.0')).toBeGreaterThan(0);
    expect(VersionLens.compareVersions('1.0.0', '1.0.0')).toBe(0);
  });
});
