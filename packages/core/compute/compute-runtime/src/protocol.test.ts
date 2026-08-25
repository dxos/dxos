//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { InvalidOperationInputError } from '@dxos/compute';
import * as Operation from '@dxos/compute/Operation';
import { FibonacciHandler, ReplyHandler } from '@dxos/compute/testing';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { type EdgeFunctionEnv } from '@dxos/protocols';

import { makeOperationServiceLayer, wrapFunctionHandler } from './protocol';

describe('wrapFunctionHandler', () => {
  test('wraps reply function and executes handler', async ({ expect }) => {
    const wrapped = wrapFunctionHandler(ReplyHandler);

    expect(wrapped.meta.key).toBe(DXN.make('com.example.operation.reply'));
    expect(wrapped.meta.name).toBe('Reply');

    const testData = { message: 'hello' };
    const result = await wrapped.handler({
      data: testData,
      context: {
        services: {},
      },
    });

    expect(result).toEqual(testData);
  });

  test('wraps fibonacci function with valid input', async ({ expect }) => {
    const wrapped = wrapFunctionHandler(FibonacciHandler);

    expect(wrapped.meta.key).toBe(DXN.make('com.example.operation.fib'));
    expect(wrapped.meta.name).toBe('Fibonacci');

    const result = await wrapped.handler({
      data: { iterations: 10 },
      context: {
        services: {},
      },
    });

    expect(result).toEqual({ result: '55' });
  });

  test('throws InvalidOperationInputError on invalid input schema for fibonacci', async ({ expect }) => {
    const wrapped = wrapFunctionHandler(FibonacciHandler);

    await expect(
      wrapped.handler({
        data: { iterations: 'invalid' },
        context: {
          services: {},
        },
      }),
    ).rejects.toThrow(InvalidOperationInputError);
  });
});

describe('EDGE Operation.Service', () => {
  const Deployed = Operation.make({
    meta: { key: DXN.make('com.example.operation.deployed'), name: 'Deployed', deployedId: 'fn-deployed' },
    input: Schema.Struct({ value: Schema.String }),
    output: Schema.Void,
  });

  // No `deployedId`: the shape of any definition a handler imported directly rather than
  // deserializing from the registry — e.g. `space.addObject` scheduling `observability.sendEvent`.
  const Local = Operation.make({
    meta: { key: DXN.make('com.example.operation.local'), name: 'Local' },
    input: Schema.Struct({ value: Schema.String }),
    output: Schema.Void,
  });

  // Scheduling from inside a wrapped handler exercises the service the EDGE runtime actually
  // installs, including the branch taken when no `functionsService` is configured.
  const Scheduler = Operation.make({
    meta: { key: DXN.make('com.example.operation.scheduler'), name: 'Scheduler' },
    input: Schema.Void,
    output: Schema.Void,
  }).pipe(Operation.withHandler(() => Operation.schedule(Local, { value: 'x' })));

  test('routes a scheduled operation by deployedId', async ({ expect }) => {
    const calls: { deploymentId: string; input: unknown }[] = [];
    await scheduleWith(Deployed, calls);

    expect(calls).toEqual([{ deploymentId: 'fn-deployed', input: { value: 'x' } }]);
  });

  // Regression: this used to assert, and the resulting defect propagated out of the *calling*
  // operation — `projects.create` 500'd at EDGE because the `space.addObject` inside it scheduled
  // an observability event no worker registers a handler for.
  test('drops an unroutable scheduled operation instead of failing its caller', async ({ expect }) => {
    const calls: { deploymentId: string; input: unknown }[] = [];
    await expect(scheduleWith(Local, calls)).resolves.toBeUndefined();

    expect(calls).toEqual([]);
  });

  // The same contract on the other variant: a context with no `functionsService` cannot route
  // anything, and must still not fail the handler that scheduled the followup.
  test('drops a scheduled followup when no functionsService is configured', async ({ expect }) => {
    const wrapped = wrapFunctionHandler(Scheduler);

    await expect(wrapped.handler({ data: undefined, context: { services: {} } })).resolves.toBeUndefined();
  });
});

//
// Helpers.
//

// Results cross a Cloudflare RPC boundary in production, so every one carries `Symbol.dispose`.
const disposable = { [Symbol.dispose]: () => {} };

const makeFunctionsService = (calls: { deploymentId: string; input: unknown }[]): EdgeFunctionEnv.FunctionsService => ({
  query: async () => Object.assign([], disposable),
  invoke: async (deploymentId, input) => {
    calls.push({ deploymentId, input });
    return { _kind: 'success' as const, data: undefined, ...disposable };
  },
});

const scheduleWith = async (
  op: Operation.Definition<{ readonly value: string }, void>,
  calls: { deploymentId: string; input: unknown }[],
) =>
  EffectEx.runPromise(
    Effect.flatMap(Operation.Service, (service) => service.schedule(op, { value: 'x' })).pipe(
      Effect.provide(makeOperationServiceLayer(makeFunctionsService(calls))),
    ),
  );
