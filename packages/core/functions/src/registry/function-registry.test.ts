//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { Context } from '@dxos/context';
import { Filter } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { FunctionRegistry } from './function-registry';
import { createInitializedClients } from '../testing/setup';
import { FunctionDef, type FunctionManifest } from '../types';

const testManifest: FunctionManifest = {
  functions: [
    {
      functionId: 'dxos.functions.test/hello',
      route: '/hello',
      handler: 'test',
    },
  ],
};

describe('function registry', () => {
  let ctx: Context;
  let testBuilder: TestBuilder;
  beforeEach(async () => {
    ctx = new Context();
    testBuilder = new TestBuilder();
  });
  afterEach(async () => {
    await ctx.dispose();
    await testBuilder.destroy();
  });

  describe('register', () => {
    test('creates new functions', async () => {
      const client = (await createInitializedClients(testBuilder))[0];
      const registry = createRegistry(client);
      const space = await client.spaces.create();
      await registry.register(space, testManifest);
      const { objects: definitions } = await space.db.query(Filter.schema(FunctionDef)).run();
      expect(definitions.length).to.eq(1);
      expect(definitions[0].functionId).to.eq(testManifest.functions?.[0]?.functionId);
    });

    test('de-duplicates by functionId', async () => {
      const client = (await createInitializedClients(testBuilder))[0];
      const registry = createRegistry(client);
      const space = await client.spaces.create();
      space.db.graph.runtimeSchemaRegistry.registerSchema(FunctionDef);
      const existing = space.db.add(create(FunctionDef, { ...testManifest.functions![0] }));
      await registry.register(space, testManifest);
      const { objects: definitions } = await space.db.query(Filter.schema(FunctionDef)).run();
      expect(definitions.length).to.eq(1);
      expect(definitions[0].id).to.eq(existing.id);
    });
  });

  describe('onFunctionsRegistered', () => {
    test('called with all registered when opened', async () => {
      const client = (await createInitializedClients(testBuilder))[0];
      const registry = createRegistry(client);
      const space = await client.spaces.create();
      space.db.graph.runtimeSchemaRegistry.registerSchema(FunctionDef);
      const definitions = range(3, () => create(FunctionDef, { ...testManifest.functions![0] }));
      definitions.forEach((def) => space.db.add(def));

      const functionRegistered = new Trigger<FunctionDef[]>();
      registry.onFunctionsRegistered.on((fn) => {
        functionRegistered.wake(fn.newFunctions);
      });
      void registry.open(ctx);
      const functions = await functionRegistered.wait();
      const expected = definitions.map((d) => d.id).sort();
      expect(functions.map((f) => f.id).sort()).to.deep.eq(expected);
    });

    test('called when a new functions is added', async () => {
      const client = (await createInitializedClients(testBuilder))[0];
      const registry = createRegistry(client);
      const space = await client.spaces.create();

      const functionRegistered = new Trigger<FunctionDef>();
      registry.onFunctionsRegistered.on((fn) => {
        expect(fn.newFunctions.length).to.eq(1);
        functionRegistered.wake(fn.newFunctions[0]);
      });
      await registry.open(ctx);
      await registry.register(space, testManifest);
      const registered = await functionRegistered.wait();
      expect(registered.functionId).to.eq(testManifest.functions![0].functionId);
    });
  });

  const createRegistry = (client: Client) => {
    const registry = new FunctionRegistry(client);
    ctx.onDispose(() => registry.close());
    return registry;
  };
});
