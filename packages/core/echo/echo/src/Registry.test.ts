//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { runAndForwardErrors } from '@dxos/effect';

import * as Obj from './Obj';
import * as Registry from './Registry';
import { TestSchema } from './testing';
import * as Type from './Type';

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

  test('addTypes and getTypeByDXN', ({ expect }) => {
    const registry = Registry.make();
    // PersistentType is a valid AnyEntity with typename 'dxos.org.echo.schema' and version '0.1.0'.
    const schema = Type.PersistentType;
    const typename = Type.getTypename(schema);
    const version = Type.getVersion(schema);

    registry.addTypes([schema]);

    // Exact DXN lookup.
    expect(registry.getTypeByDXN(`dxn:type:${typename}:${version}`)).toBe(schema);
    // Short-form lookup (without dxn: prefix).
    expect(registry.getTypeByDXN(`${typename}:${version}`)).toBe(schema);
    // Missing DXN.
    expect(registry.getTypeByDXN('dxn:type:org.example.Bar:1.0.0')).toBeUndefined();
  });

  test('types are not surfaced in list()', ({ expect }) => {
    const registry = Registry.make();
    registry.addTypes([Type.PersistentType]);
    expect(registry.list()).toHaveLength(0);
    expect(registry.types).toHaveLength(1);
  });

  test('changed fires on add/remove/clear/addTypes', ({ expect }) => {
    const registry = Registry.make();
    let count = 0;
    registry.changed.on(() => count++);

    const obj = makeObj({ value: 1 });
    registry.add([obj]);
    expect(count).toBe(1);
    registry.remove(obj.id);
    expect(count).toBe(2);
    registry.clear();
    expect(count).toBe(3);
    registry.addTypes([Type.PersistentType]);
    expect(count).toBe(4);
  });
});
