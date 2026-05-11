//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Filter, Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { runAndForwardErrors } from '@dxos/effect';

import { Registry } from './index';

const makeObj = (props: { key?: string; version?: string; value: number }) =>
  Obj.make(TestSchema.Expando, {
    [Obj.Meta]: { key: props.key, version: props.version },
    value: props.value,
  });

describe('Registry', () => {
  test('add/get/remove/list', ({ expect }) => {
    const registry = Registry.make();
    const a = makeObj({ key: 'org.example.type.a', version: '1.0.0', value: 1 });
    const b = makeObj({ key: 'org.example.type.b', version: '2.0.0', value: 2 });

    registry.addMany([a, b]);
    expect(registry.list()).toHaveLength(2);
    expect(registry.get(a.id)).toBe(a);

    expect(registry.remove(a.id)).toBe(true);
    expect(registry.remove(a.id)).toBe(false);
    expect(registry.get(a.id)).toBeUndefined();
    expect(registry.list()).toHaveLength(1);
  });

  test('query by key', ({ expect }) => {
    const a = makeObj({ key: 'org.example.type.foo', version: '1.2.0', value: 1 });
    const b = makeObj({ key: 'org.example.type.foo', version: '2.0.0', value: 2 });
    const c = makeObj({ key: 'org.example.type.bar', version: '1.0.0', value: 3 });

    const registry = Registry.make({ initial: [a, b, c] });

    const fooResults = registry.query(Query.select(Filter.key('org.example.type.foo'))).runSync();
    expect(fooResults.map((o) => (o as any).value).sort()).toEqual([1, 2]);

    const fooV1 = registry.query(Query.select(Filter.key('org.example.type.foo', { version: '^1.0.0' }))).runSync();
    expect(fooV1).toHaveLength(1);
    expect((fooV1[0] as any).value).toBe(1);
  });

  test('upstream delegation', ({ expect }) => {
    const upstreamObj = makeObj({ key: 'org.example.type.foo', version: '1.0.0', value: 100 });
    const localObj = makeObj({ key: 'org.example.type.bar', version: '1.0.0', value: 200 });

    const upstream = Registry.make({ initial: [upstreamObj] });
    const local = Registry.make({ upstream, initial: [localObj] });

    expect(local.get(upstreamObj.id)).toBe(upstreamObj);
    expect(local.get(localObj.id)).toBe(localObj);
    expect(
      local
        .list()
        .map((o) => (o as any).value)
        .sort(),
    ).toEqual([100, 200]);

    const allFoo = local.query(Query.select(Filter.key('org.example.type.foo'))).runSync();
    expect(allFoo).toHaveLength(1);
    expect((allFoo[0] as any).value).toBe(100);
  });

  test('local overrides upstream by id', ({ expect }) => {
    const original = makeObj({ key: 'org.example.type.foo', version: '1.0.0', value: 100 });
    const override = Obj.make(TestSchema.Expando, {
      id: original.id,
      [Obj.Meta]: { key: 'org.example.type.foo', version: '2.0.0' },
      value: 999,
    });

    const upstream = Registry.make({ initial: [original] });
    const local = Registry.make({ upstream, initial: [override] });

    expect((local.get(original.id) as any).value).toBe(999);
    expect(local.list()).toHaveLength(1);
  });

  test('limit clause', ({ expect }) => {
    const objects = [1, 2, 3, 4].map((value) => makeObj({ key: 'org.example.type.foo', version: '1.0.0', value }));
    const registry = Registry.make({ initial: objects });

    const limited = registry.query(Query.select(Filter.key('org.example.type.foo')).limit(2)).runSync();
    expect(limited).toHaveLength(2);
  });

  test('Effect layer provides registry', async ({ expect }) => {
    const obj = makeObj({ key: 'org.example.type.foo', version: '1.0.0', value: 42 });

    const program = Effect.gen(function* () {
      const registry = yield* Registry.Service;
      return registry.list();
    });

    const result = await runAndForwardErrors(program.pipe(Effect.provide(Registry.layer({ initial: [obj] }))));
    expect(result).toHaveLength(1);
    expect((result[0] as any).value).toBe(42);
  });

  test('layerWithUpstream wires upstream from environment', async ({ expect }) => {
    const upstreamObj = makeObj({ key: 'org.example.type.foo', version: '1.0.0', value: 1 });
    const localObj = makeObj({ key: 'org.example.type.bar', version: '1.0.0', value: 2 });

    const program = Effect.gen(function* () {
      const registry = yield* Registry.Service;
      return registry.list().map((o) => (o as any).value);
    });

    const stack = Layer.provide(
      Registry.layerWithUpstream({ initial: [localObj] }),
      Registry.layer({ initial: [upstreamObj] }),
    );

    const result = await runAndForwardErrors(program.pipe(Effect.provide(stack)));
    expect(result.sort()).toEqual([1, 2]);
  });
});
