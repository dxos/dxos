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
import { createInitializedClients } from '../testing';
import { FunctionDef, type FunctionManifest } from '../types';

const testManifest: FunctionManifest = {
  functions: [
    {
      uri: 'dxos.functions.test/hello',
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
      expect(definitions[0].uri).to.eq(testManifest.functions?.[0]?.uri);
    });

    test('de-duplicates by function URI', async () => {
      const client = (await createInitializedClients(testBuilder))[0];
      const registry = createRegistry(client);
      const space = await client.spaces.create();
      const existing = space.db.add(create(FunctionDef, { ...testManifest.functions![0] }));
      await registry.register(space, testManifest);
      const { objects: definitions } = await space.db.query(Filter.schema(FunctionDef)).run();
      expect(definitions.length).to.eq(1);
      expect(definitions[0].uri).to.eq(existing.uri);
    });
  });

  describe('onFunctionsRegistered', () => {
    test('called with all registered when opened', async () => {
      const client = (await createInitializedClients(testBuilder))[0];
      const registry = createRegistry(client);
      const space = await client.spaces.create();
      const definitions = range(3, () => create(FunctionDef, { ...testManifest.functions![0] }));
      definitions.forEach((def) => space.db.add(def));

      const functionRegistered = new Trigger<FunctionDef[]>();
      registry.onFunctionsRegistered.on((fn) => {
        functionRegistered.wake(fn.newFunctions);
      });
      void registry.open(ctx);
      const functions = await functionRegistered.wait();
      const expected = definitions.map((def) => def.uri).sort();
      expect(functions.map((fn) => fn.uri).sort()).to.deep.eq(expected);
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
      expect(registered.uri).to.eq(testManifest.functions![0].uri);
    });
  });

  const createRegistry = (client: Client) => {
    const registry = new FunctionRegistry(client);
    ctx.onDispose(() => registry.close());
    return registry;
  };
});
