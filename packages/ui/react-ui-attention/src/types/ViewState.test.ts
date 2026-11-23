//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import { describe, test } from 'vitest';

import { createDefaultBackends } from '../core/index.ts';
import { Manager, define, patch } from './ViewState.ts';

const Counter = define({
  key: 'counter',
  backend: 'memory',
  schema: Schema.Struct({ value: Schema.Number }).mapFields(Struct.map(Schema.mutableKey)),
  defaultValue: () => ({ value: 0 }),
});

const Followed = define({ ...Counter, key: 'followed', follow: 'write' });

const Camera = define({
  key: 'camera',
  backend: 'memory',
  schema: Schema.Struct({ zoom: Schema.Number, grid: Schema.Boolean }).mapFields(Struct.map(Schema.mutableKey)),
  defaultValue: () => ({ zoom: 1, grid: false }),
  follow: { policy: 'write', fields: ['zoom'] },
});

const A = 'echo:@A';
const B = 'echo:@B';

describe('Manager', () => {
  const make = () => {
    const registry = Registry.make();
    return new Manager({ registry, backends: createDefaultBackends(registry) });
  };

  test('returns the aspect default for an unwritten context', ({ expect }) => {
    const manager = make();
    expect(manager.get(Counter, 'a')).toEqual({ value: 0 });
  });

  test('set then get round-trips per context', ({ expect }) => {
    const manager = make();
    manager.set(Counter, 'a', { value: 5 });
    expect(manager.get(Counter, 'a')).toEqual({ value: 5 });
    expect(manager.get(Counter, 'b')).toEqual({ value: 0 });
  });

  test('subscribe fires on change for that context', ({ expect }) => {
    const manager = make();
    let calls = 0;
    const dispose = manager.subscribe(Counter, 'a', () => {
      calls++;
    });
    manager.set(Counter, 'a', { value: 1 });
    expect(calls).toBeGreaterThan(0);
    dispose();
  });

  test('contexts enumerates touched contexts for an aspect', ({ expect }) => {
    const manager = make();
    manager.set(Counter, 'a', { value: 1 });
    manager.set(Counter, 'b', { value: 2 });
    expect(new Set(manager.contexts(Counter))).toEqual(new Set(['a', 'b']));
  });

  test("a follower takes the leader's encoded values of followed aspects, holding those for an aspect it has not used", ({
    expect,
  }) => {
    const leader = make();
    leader.set(Counter, 'a', { value: 1 });
    leader.set(Followed, 'a', { value: 2 });
    leader.set(Followed, 'b', { value: 3 });
    const sent = leader.followed(['a']);
    expect(sent).toEqual({ followed: { a: { value: 2 } } });

    const follower = make();
    follower.setEncoded('followed', 'a', sent.followed.a);
    follower.setEncoded('followed', 'c', 'not a counter');
    expect(follower.get(Followed, 'a')).toEqual({ value: 2 });
    expect(follower.get(Followed, 'c')).toEqual({ value: 0 });
  });

  test("an aspect following some fields sends only those and merges the leader's into the follower's own", ({
    expect,
  }) => {
    const leader = make();
    leader.set(Camera, A, { zoom: 2, grid: true });
    const sent = leader.followed([A]);
    expect(sent).toEqual({ camera: { [A]: { zoom: 2 } } });

    const follower = make();
    follower.set(Camera, A, { zoom: 1, grid: false });
    follower.setEncoded('camera', A, sent.camera[A]);
    expect(follower.get(Camera, A)).toEqual({ zoom: 2, grid: false });
  });

  test('a value written from the leader has the follow origin until this session sets it', ({ expect }) => {
    const manager = make();
    const origins: string[] = [];
    const dispose = manager.subscribe(Followed, A, (_, origin) => origins.push(origin));
    manager.setEncoded('followed', A, { value: 2 });
    expect(manager.origin(Followed, A)).toBe('follow');
    manager.set(Followed, A, { value: 3 });
    expect(manager.origin(Followed, A)).toBe('local');
    expect(origins).toEqual(['follow', 'local']);
    dispose();
  });

  test('a patch merges its fields over the current value, held until the aspect is used', ({ expect }) => {
    const manager = make();
    manager.apply(patch(Camera, A, { zoom: 2 }));
    manager.set(Camera, B, { zoom: 1, grid: true });
    manager.apply(patch(Camera, B, { zoom: 3 }));
    expect(manager.get(Camera, A)).toEqual({ zoom: 2, grid: false });
    expect(manager.get(Camera, B)).toEqual({ zoom: 3, grid: true });
    expect(manager.origin(Camera, A)).toBe('local');
  });

  test('a patch that does not decode is dropped', ({ expect }) => {
    const manager = make();
    manager.set(Camera, A, { zoom: 2, grid: true });
    manager.apply({ aspect: 'camera', context: A, fields: { zoom: 'near' } });
    expect(manager.get(Camera, A)).toEqual({ zoom: 2, grid: true });
  });
});
