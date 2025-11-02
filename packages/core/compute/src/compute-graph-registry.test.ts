//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { fullyQualifiedId } from '@dxos/client/echo';
import { Function, FunctionDefinition } from '@dxos/functions';

import { ComputeGraphRegistry, defaultPlugins } from './compute-graph-registry';
import { TestBuilder, createMockedComputeRuntimeProvider } from './testing';

describe('ComputeGraphRegistry', () => {
  const add = FunctionDefinition.make({
    key: 'add',
    name: 'add',
    description: 'Adds two numbers',
    inputSchema: Schema.Struct({ a: Schema.Number, b: Schema.Number }),
    outputSchema: Schema.Number,
    handler: ({ data }) => data.a + data.b,
  });

  test('invokes user function through compute graph', async () => {
    const computeRuntime = createMockedComputeRuntimeProvider({ functions: [add] });
    const testBuilder = new TestBuilder({ types: [Function.Function], computeRuntime });
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

  test('adding a function binding updates autocomplete and enables execution', async () => {
    const computeRuntime = createMockedComputeRuntimeProvider({ functions: [add] });
    const testBuilder = new TestBuilder({ types: [Function.Function], computeRuntime });
    await testBuilder.open();
    onTestFinished(async () => {
      await testBuilder.close();
    });

    const space = await testBuilder.client.spaces.create();

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

    // Initially there should be no echo functions.
    expect(graph.getFunctions({ standard: false, echo: true }).length).to.equal(0);

    // Subscribe for function updates.
    const functionsUpdated = new Trigger<void>();
    const unsubscribe = graph.update.on((e) => {
      if (e.type === 'functionsUpdated') {
        functionsUpdated.wake();
      }
    });
    onTestFinished(unsubscribe);

    // Add a bound function to the space; graph should pick it up.
    const functionObj = FunctionDefinition.serialize(add);
    functionObj.binding = 'ADD';
    space.db.add(functionObj);

    await functionsUpdated.wait();

    // Autocomplete should now include the binding.
    const echoFunctions = graph.getFunctions({ standard: false, echo: true }).map((fn) => fn.name);
    expect(echoFunctions).toContain('ADD');

    // And the binding should execute when used in a formula.
    const node = await graph.getOrCreateNode('sheet').open();
    onTestFinished(async () => {
      await node.close();
    });

    const valueSettled = new Trigger<number>();
    node.update.on(() => {
      const value = node.getValue({ row: 0, col: 0 });
      if (typeof value === 'number') {
        valueSettled.wake(value);
      }
    });

    node.setValue({ row: 0, col: 0 }, '=ADD(2, 3)');
    const result = await valueSettled.wait();
    expect(result).to.equal(5);
  });
});
