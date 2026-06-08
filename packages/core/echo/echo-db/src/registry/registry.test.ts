//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Obj, Registry, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EffectEx } from '@dxos/effect';

import { makeRegistry, registryLayer, registryLayerWithUpstream } from './registry';

const makeObj = (props: { key?: string; version?: string; value: number }) =>
  Obj.make(TestSchema.Expando, {
    [Obj.Meta]: { key: props.key, version: props.version },
    value: props.value,
  });

describe('Registry', () => {
  test('add/get/remove/list', ({ expect }) => {
    const registry = makeRegistry();
    const a = makeObj({ key: 'org.example.type.a', version: '1.0.0', value: 1 });
    const b = makeObj({ key: 'org.example.type.b', version: '2.0.0', value: 2 });

    registry.add([a, b]);
    expect(registry.list()).toHaveLength(2);
    expect(registry.get(a.id)).toBe(a);

    expect(registry.remove(a.id)).toBe(true);
    expect(registry.remove(a.id)).toBe(false);
    expect(registry.get(a.id)).toBeUndefined();
    expect(registry.list()).toHaveLength(1);
  });

  test('upstream delegation', ({ expect }) => {
    const upstreamObj = makeObj({ key: 'org.example.type.foo', version: '1.0.0', value: 100 });
    const localObj = makeObj({ key: 'org.example.type.bar', version: '1.0.0', value: 200 });

    const upstream = makeRegistry({ initial: [upstreamObj] });
    const local = makeRegistry({ upstream, initial: [localObj] });

    expect(local.get(upstreamObj.id)).toBe(upstreamObj);
    expect(local.get(localObj.id)).toBe(localObj);
    expect(
      local
        .list()
        .map((o) => (o as any).value)
        .sort(),
    ).toEqual([100, 200]);
  });

  test('local overrides upstream by id', ({ expect }) => {
    const original = makeObj({ key: 'org.example.type.foo', version: '1.0.0', value: 100 });
    const override = Obj.make(TestSchema.Expando, {
      id: original.id,
      [Obj.Meta]: { key: 'org.example.type.foo', version: '2.0.0' },
      value: 999,
    });

    const upstream = makeRegistry({ initial: [original] });
    const local = makeRegistry({ upstream, initial: [override] });

    expect((local.get(original.id) as any).value).toBe(999);
    expect(local.list()).toHaveLength(1);
  });

  test('Effect layer provides registry', async ({ expect }) => {
    const obj = makeObj({ key: 'org.example.type.foo', version: '1.0.0', value: 42 });

    const program = Effect.gen(function* () {
      const registry = yield* Registry.Service;
      return registry.list();
    });

    const result = await EffectEx.runAndForwardErrors(program.pipe(Effect.provide(registryLayer({ initial: [obj] }))));
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
      registryLayerWithUpstream({ initial: [localObj] }),
      registryLayer({ initial: [upstreamObj] }),
    );

    const result = await EffectEx.runAndForwardErrors(program.pipe(Effect.provide(stack)));
    expect(result.sort()).toEqual([1, 2]);
  });

  test('add type entity and getByURI', ({ expect }) => {
    const registry = makeRegistry();
    // Type.Type is a valid AnyEntity with typename and version.
    const schema = Type.Type;
    const typename = Type.getTypename(schema);
    const version = Type.getVersion(schema);

    registry.add([schema]);

    // Type entity is included in list().
    expect(registry.list().filter(Type.isType)).toHaveLength(1);

    // Exact DXN lookup via getByURI.
    expect(registry.getByURI(`dxn:${typename}:${version}`)).toBe(schema);
    // Legacy "dxn:type:" prefixed lookup is normalised to canonical form.
    expect(registry.getByURI(`dxn:type:${typename}:${version}`)).toBe(schema);
    // Short-form (without dxn: prefix) is not a valid DXN and does not resolve.
    expect(registry.getByURI(`${typename}:${version}`)).toBeUndefined();
    // Missing DXN.
    expect(registry.getByURI('dxn:org.example.Bar:1.0.0')).toBeUndefined();
  });

  test('add keyed entity and getByURI', ({ expect }) => {
    const registry = makeRegistry();
    const obj = makeObj({ key: 'org.example.function.translate', version: '0.1.0', value: 1 });
    registry.add([obj]);

    // Resolvable by versioned and unversioned key DXN.
    expect(registry.getByURI('dxn:org.example.function.translate:0.1.0')).toBe(obj);
    expect(registry.getByURI('dxn:org.example.function.translate')).toBe(obj);
    // Missing key DXN.
    expect(registry.getByURI('dxn:org.example.function.missing')).toBeUndefined();

    // Type entities remain resolvable via the same generic lookup.
    registry.add([Type.Type]);
    const typename = Type.getTypename(Type.Type);
    const version = Type.getVersion(Type.Type);
    expect(registry.getByURI(`dxn:${typename}:${version}`)).toBe(Type.Type);

    // Index entries are removed alongside the entity.
    expect(registry.remove(obj.id)).toBe(true);
    expect(registry.getByURI('dxn:org.example.function.translate:0.1.0')).toBeUndefined();
    expect(registry.getByURI('dxn:org.example.function.translate')).toBeUndefined();
  });

  test('getByURI resolves through upstream', ({ expect }) => {
    const upstream = makeRegistry({
      initial: [makeObj({ key: 'org.example.function.summarize', version: '0.2.0', value: 1 })],
    });
    const local = makeRegistry({ upstream });
    expect(local.getByURI('dxn:org.example.function.summarize:0.2.0')).toBeDefined();
    expect(local.getByURI('dxn:org.example.function.summarize')).toBeDefined();
  });

  test('type entities are surfaced in list()', ({ expect }) => {
    const registry = makeRegistry();
    const obj = makeObj({ value: 1 });
    registry.add([obj, Type.Type]);
    // Both regular objects and type entities appear in list().
    expect(registry.list()).toHaveLength(2);
    expect(registry.list().filter(Type.isType)).toHaveLength(1);
  });

  test('changed fires on add/remove/clear', ({ expect }) => {
    const registry = makeRegistry();
    let count = 0;
    registry.changed.on(() => count++);

    const obj = makeObj({ value: 1 });
    registry.add([obj]);
    expect(count).toBe(1);
    registry.remove(obj.id);
    expect(count).toBe(2);
    registry.clear();
    expect(count).toBe(3);
    // Type entities also fire changed when added.
    registry.add([Type.Type]);
    expect(count).toBe(4);
  });
});
