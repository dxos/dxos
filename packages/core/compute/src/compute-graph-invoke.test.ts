//
// Copyright 2025 DXOS.org
//

import { Layer, ManagedRuntime, Schema } from 'effect';
import { beforeEach, describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { fullyQualifiedId } from '@dxos/client/echo';
import { FunctionDefinition, FunctionInvocationService, FunctionType } from '@dxos/functions';

import { ComputeGraphRegistry, defaultPlugins } from './compute-graph-registry';
import { createMockedComputeRuntimeProvider, TestBuilder } from './testing';

describe.only('ComputeGraph invocation via FunctionInvocationService', () => {
  let testBuilder: TestBuilder;

  beforeEach(async () => {
    // Provide FunctionType so ECHO can store function objects.
    testBuilder = new TestBuilder({ types: [FunctionType] });
    await testBuilder.open();
  });

  test('invokes user function through compute graph', async () => {
    const space = await testBuilder.client.spaces.create();

    // Define a simple function: add(a, b) => a + b.
    const add = FunctionDefinition.make({
      key: 'add',
      name: 'add',
      description: 'Adds two numbers',
      inputSchema: Schema.Struct({ a: Schema.Number, b: Schema.Number }),
      outputSchema: Schema.Number,
      handler: ({ data }) => data.a + data.b,
    });

    // Compute runtime provider for this test.
    const computeRuntime = createMockedComputeRuntimeProvider({ functions: [add] });

    // Register Edge function plugin and runtime in the registry.
    const registry = new ComputeGraphRegistry({ plugins: defaultPlugins, computeRuntime });
    await registry.open();
    testBuilder.ctx.onDispose(() => registry.close());

    const graph = registry.createGraph(space);
    await graph.open();

    // Create a function object in ECHO with binding that maps to DX calls.
    const functionObj = FunctionDefinition.serialize(add);
    functionObj.binding = 'ADD';
    space.db.add(functionObj);

    const node = await graph.getOrCreateNode('sheet').open();

    // Wait for value update after async invocation completes.
    const trigger = new Trigger<number>();
    node.update.on(() => {
      const value = node.getValue({ row: 0, col: 0 });
      if (typeof value === 'number') {
        trigger.wake(value);
      }
    });

    // Set formula using binding; graph will map to DX("ADD", ...)
    node.setValue({ row: 0, col: 0 }, '=ADD(2, 3)');

    const result = await trigger.wait();
    expect(result).to.equal(5);

    // Sanity check: mapping to fully qualified id works as well.
    const bindingId = graph.mapFunctionBindingToId('ADD(2, 3)');
    expect(bindingId.startsWith(`${fullyQualifiedId(functionObj)}`)).to.be.true;
  });
});
