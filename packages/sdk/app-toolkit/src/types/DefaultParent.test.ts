//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Annotation, Collection, Database, DXN, Obj, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Position } from '@dxos/util';

import * as AppCapabilities from '../app-framework/AppCapabilities.ts';
import * as DefaultParent from './DefaultParent.ts';

const TAG = 'com.example.tag.filed';

const Tagged = Type.makeObject(DXN.make('com.example.type.tagged', '0.1.0'))(
  Schema.Struct({ name: Schema.String }).pipe(Annotation.UserType.set({ tags: [TAG] })),
);

const Untagged = Type.makeObject(DXN.make('com.example.type.untagged', '0.1.0'))(
  Schema.Struct({ name: Schema.String }).pipe(Annotation.UserType.set()),
);

describe('DefaultParent.resolve', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Collection.Collection, Tagged, Untagged] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const withRules = (rules: AppCapabilities.DefaultParent[]) => {
    const manager = CapabilityManager.make({ registry: Registry.make() });
    for (const rule of rules) {
      manager.contribute({ module: 'test', interface: AppCapabilities.DefaultParent, implementation: rule });
    }
    return Layer.succeed(Capability.Service, manager);
  };

  const resolve = (object: Obj.Unknown, capabilities?: Layer.Layer<Capability.Service>) =>
    DefaultParent.resolve(object).pipe(
      Effect.provide(Database.layer(db)),
      capabilities ? Effect.provide(capabilities) : (effect) => effect,
      Effect.runPromise,
    );

  test('asks the rules for the type tags and takes the first parent by position', async ({ expect }) => {
    const first = db.add(Collection.make({ name: 'first' }));
    const second = db.add(Collection.make({ name: 'second' }));
    const rules = withRules([
      { tag: TAG, resolve: () => Effect.succeed(second), position: Position.last },
      { tag: TAG, resolve: () => Effect.succeed(undefined), position: Position.first },
      { tag: TAG, resolve: () => Effect.succeed(first) },
    ]);

    expect((await resolve(Obj.make(Tagged, { name: 'a' }), rules))?.id).toBe(first.id);
    expect(await resolve(Obj.make(Untagged, { name: 'b' }), rules)).toBeUndefined();
  });

  test('resolves nothing without a capability manager', async ({ expect }) => {
    expect(await resolve(Obj.make(Tagged, { name: 'a' }))).toBeUndefined();
  });
});
