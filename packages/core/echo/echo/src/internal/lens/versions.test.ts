//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Lens from '../../Lens.ts';
import * as Type from '../../Type.ts';

const TYPENAME = 'org.dxos.test.task';

const TaskV1 = Type.makeObject(DXN.make(TYPENAME, '0.1.0'))(
  Schema.Struct({ title: Schema.String, notes: Schema.optional(Schema.String) }),
);

const TaskV2 = Type.makeObject(DXN.make(TYPENAME, '0.2.0'))(
  Schema.Struct({ name: Schema.String, notes: Schema.optional(Schema.String), done: Schema.Boolean }),
);

const TaskV3 = Type.makeObject(DXN.make(TYPENAME, '0.3.0'))(
  Schema.Struct({ name: Schema.String, done: Schema.Boolean }),
);

const v1v2 = Lens.make(TaskV1, TaskV2, { name: 'title' }, { defaults: { done: false } });
const v2v3 = Lens.make(TaskV2, TaskV3, {}, { defaults: { notes: '' } });

describe('lenses between versions', () => {
  test('forward and backward are inverse for data both versions can hold', () => {
    const step = Lens.versionStep(v1v2);
    const v1 = { title: 'Plan', notes: 'soon' };
    expect(step.forward(v1)).toEqual({ name: 'Plan', notes: 'soon', done: false });
    expect(step.backward(step.forward(v1))).toEqual(v1);
    expect(Lens.versionStep(v2v3).backward({ name: 'Plan', done: true })).toEqual({
      name: 'Plan',
      done: true,
      notes: '',
    });
  });

  test('a property only the target has keeps a value the object already has', () => {
    expect(Lens.versionStep(v1v2).forward({ title: 'Plan', done: true })).toEqual({ name: 'Plan', done: true });
  });

  test('a default comes from the schema unless the lens declares one', () => {
    const Defaulted = Type.makeObject(DXN.make(TYPENAME, '0.2.0'))(
      Schema.Struct({ name: Schema.String, tags: Schema.Array(Schema.String).annotate({ default: [] }) }),
    );
    const step = Lens.versionStep(Lens.make(TaskV1, Defaulted, { name: 'title' }));
    const one = step.forward({ title: 'Plan' });
    const two = step.forward({ title: 'Plan' });
    expect(one).toEqual({ name: 'Plan', tags: [] });
    // Defaults are copied per result, so two objects never share one array.
    expect(one.tags).not.toBe(two.tags);
  });

  test('a path composes lenses in either direction', () => {
    const lenses = [v2v3, v1v2];
    const up = Lens.versionPath(lenses, TYPENAME, '0.1.0', '0.3.0');
    const down = Lens.versionPath(lenses, TYPENAME, '0.3.0', '0.1.0');
    expect(up?.digests).toEqual([v1v2.digest, v2v3.digest]);
    // A hop against a lens's direction is identified by the same digest.
    expect(down?.digests).toEqual([v2v3.digest, v1v2.digest]);
    expect(up?.apply({ title: 'Plan', notes: 'soon' })).toEqual({ name: 'Plan', done: false });
    expect(down?.apply({ name: 'Plan', done: true })).toEqual({ title: 'Plan', notes: '' });
    expect(Lens.versionPath([v1v2], TYPENAME, '0.1.0', '0.3.0')).toBeUndefined();
    expect(Lens.versionsOf(lenses, TYPENAME)).toEqual(['0.1.0', '0.2.0', '0.3.0']);
  });

  test('a version lens connects an older version of one type to a newer one', () => {
    const Other = Type.makeObject(DXN.make('org.dxos.test.other', '0.2.0'))(Schema.Struct({ title: Schema.String }));
    expect(Lens.isVersionLens(v1v2)).toBe(true);
    expect(Lens.isVersionLens(Lens.make(TaskV1, Other))).toBe(false);
    expect(Lens.isVersionLens(Lens.make(TaskV2, TaskV1, { title: 'name' }))).toBe(false);
  });

  test('only renames and same-name matches translate version documents', () => {
    const converted = Lens.make(
      TaskV1,
      TaskV2,
      {
        name: { from: ['title'], get: ({ title }) => title.toUpperCase(), put: (name: string) => ({ title: name }) },
      },
      { defaults: { done: false } },
    );
    expect(Lens.isVersionLens(converted)).toBe(true);
    expect(() => Lens.versionStep(converted)).toThrow(/"name" is not a rename or a same-name match/);
  });

  test('a required property only one side has needs a default', () => {
    expect(() => Lens.versionStep(Lens.make(TaskV1, TaskV2, { name: 'title' }))).toThrow(
      /"done" is required in .* and has no default/,
    );
  });

  test('the digest follows what the lens does, not how it was declared', () => {
    const again = Lens.make(TaskV1, TaskV2, { name: 'title' }, { defaults: { done: false } });
    expect(again.digest).toBe(v1v2.digest);
    expect(again.id).toBe(v1v2.id);
    expect(Lens.make(TaskV1, TaskV2, { name: 'title' }, { defaults: { done: true } }).digest).not.toBe(v1v2.digest);

    // The same version, changed without a version bump, maps by name differently: a different digest.
    const Drifted = Type.makeObject(DXN.make(TYPENAME, '0.2.0'))(
      Schema.Struct({ name: Schema.String, done: Schema.Boolean }),
    );
    expect(Lens.make(TaskV1, Drifted, { name: 'title' }, { defaults: { done: false } }).digest).not.toBe(v1v2.digest);
  });

  test('versions compare numerically', () => {
    expect(Lens.compareVersions('0.10.0', '0.9.0')).toBeGreaterThan(0);
    expect(Lens.compareVersions('1.0.0', '1.0.0')).toBe(0);
  });
});
