//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { fullyQualifiedId } from '@dxos/client/echo';
import { FunctionDefinition, FunctionType } from '@dxos/functions';

import { ComputeGraphRegistry, defaultPlugins } from './compute-graph-registry';
import { TestBuilder, createMockedComputeRuntimeProvider } from './testing';

describe('ComputeGraph invocation via FunctionInvocationService', () => {
  test('invokes user function through compute graph', async () => {
    // Define a simple function: add(a, b) => a + b.
    const add = FunctionDefinition.make({
      key: 'add',
      name: 'add',
      description: 'Adds two numbers',
      inputSchema: Schema.Struct({ a: Schema.Number, b: Schema.Number }),
      outputSchema: Schema.Number,
      handler: ({ data }) => data.a + data.b,
    });

    const computeRuntime = createMockedComputeRuntimeProvider({ functions: [add] });
    const testBuilder = new TestBuilder({ types: [FunctionType], computeRuntime });
    await testBuilder.open();
    onTestFinished(async () => {
      await testBuilder.close();
    });

    const space = await testBuilder.client.spaces.create();

    // Register Edge function plugin and runtime in the registry.
    const registry = new ComputeGraphRegistry({ plugins: defaultPlugins, computeRuntime });
    await registry.open();
    onTestFinished(async () => {
      await registry.close();
    });

    const graph = registry.createGraph(space);
    await graph.open();
    onTestFinished(async () => {
      await graph.close();
    });

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
