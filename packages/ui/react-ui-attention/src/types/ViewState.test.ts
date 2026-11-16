//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import { describe, test } from 'vitest';

import { createDefaultBackends } from '../core/index.ts';
import { Manager, define } from './ViewState.ts';

const Counter = define({
  key: 'counter',
  backend: 'memory',
  schema: Schema.Struct({ value: Schema.Number }).mapFields(Struct.map(Schema.mutableKey)),
  defaultValue: () => ({ value: 0 }),
});

const Followed = define({ ...Counter, key: 'followed', follow: 'write' });

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
});
