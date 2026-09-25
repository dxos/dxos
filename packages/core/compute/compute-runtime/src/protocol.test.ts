//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import { describe, onTestFinished, test } from 'vitest';

import { InvalidOperationInputError } from '@dxos/compute';
import * as Operation from '@dxos/compute/Operation';
import { FibonacciHandler, ReplyHandler } from '@dxos/compute/testing';
import { Database, Filter, Hypergraph, Query, Ref, Registry, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { DXN, EntityId, SpaceId } from '@dxos/keys';
import { type EdgeFunctionEnv, type FunctionProtocol, makeInProcessClient } from '@dxos/protocols';
import { DataService, FeedService, QueryService } from '@dxos/protocols/rpc';

import { makeOperationServiceLayer, wrapFunctionHandler } from './protocol.ts';

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

  // Regression: the context layer provided `Database.Service` but not the cross-space handle, so
  // every operation declaring it (the `tasks.*` verbs a harness hook fires, which are handed no
  // space id) died at the first service access with `Service not found`.
  test('provides Hypergraph.Service to a handler that declares it', async ({ expect }) => {
    const ReadsGraph = Operation.make({
      meta: { key: DXN.make('com.example.operation.readsGraph'), name: 'Reads Graph' },
      services: [Hypergraph.Service],
      input: Schema.Struct({}),
      output: Schema.Struct({ resolved: Schema.Boolean }),
    }).pipe(
      Operation.withHandler(() =>
        Effect.gen(function* () {
          const service = yield* Hypergraph.Service;
          return { resolved: service !== undefined };
        }),
      ),
    );

    const result = await wrapFunctionHandler(ReadsGraph).handler({ data: {}, context: { services: {} } });

    expect(result).toEqual({ resolved: true });
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

describe('EDGE Hypergraph.Service', () => {
  // The shape `org.dxos.operation.tasks.recordSession` has: declaring `Database.Service` is what
  // marks an operation as acting on one named space, so work fired by a hook whose payload cannot
  // name one declares the graph instead.
  const ReachGraph = Operation.make({
    meta: { key: DXN.make('com.example.operation.reachGraph'), name: 'Reach Graph' },
    services: [Hypergraph.Service, Registry.Service],
    input: Schema.Struct({ spaceId: SpaceId }),
    output: Schema.Struct({ found: Schema.Boolean, matches: Schema.Number, sharesRegistry: Schema.Boolean }),
  }).pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ spaceId }) {
        const { graph } = yield* Hypergraph.Service;
        const registry = yield* Registry.Service;
        // The lookup `RecordSession` opens with, so the scope binding is exercised in both of its
        // branches: the graph names every space it holds, or none when it holds none.
        const matches = yield* Effect.promise(() =>
          graph.query(Query.select(Filter.everything()).from('all-accessible-spaces')).run(),
        );
        return {
          found: graph.getDatabase(spaceId) !== undefined,
          matches: [...matches].length,
          sharesRegistry: graph.registry === registry,
        };
      }),
    ),
  );

  test('resolves against the graph when the invocation names no space', async ({ expect }) => {
    const { services } = await openPeer();

    // No `spaceId` on the context, as a hook-fired invocation arrives: the handler still reaches the
    // graph, and answers for a space the graph does not hold rather than dying before it runs.
    const result = await wrapFunctionHandler(ReachGraph).handler({
      data: { spaceId: SpaceId.random() },
      context: { services },
    });

    expect(result).toEqual({ found: false, matches: 0, sharesRegistry: true });
  });

  test('the graph holds the database the context opened', async ({ expect }) => {
    const { peer, services } = await openPeer();
    const db = await peer.createDatabase();

    const result = await wrapFunctionHandler(ReachGraph).handler({
      data: { spaceId: db.spaceId },
      context: { services, spaceId: db.spaceId, spaceKey: db.spaceKey.toHex(), spaceRootUrl: db.rootUrl },
    });

    expect(result).toEqual({ found: true, matches: 0, sharesRegistry: true });
  });

  test('reports the missing graph at the call when no client can be built', async ({ expect }) => {
    // `Hypergraph.notAvailable` is the deliberate fallback: a host wiring no data service still
    // provides the tag, so the failure names what is missing instead of `Service not found`.
    await expect(
      wrapFunctionHandler(ReachGraph).handler({ data: { spaceId: SpaceId.random() }, context: { services: {} } }),
    ).rejects.toThrow('Hypergraph not available');
  });
});

describe('ref decoding through the input schema', () => {
  // `decodeRefsFromSchema` is what turns the wire form `{'/': 'echo:///<id>'}` into a live `Ref`
  // before the input is validated against the TYPE side of the schema, which accepts only a `Ref`
  // instance. Whether it recurses into a field therefore decides whether that field is usable at
  // all over the wire, and its `Union` case gives up as soon as a union has more than one
  // non-undefined branch.
  //
  // That is the difference between these two operations, and between `tasks.create` and
  // `tasks.update` in `@dxos/plugin-tasks`, which declare the same field the same two ways:
  //   create: milestone: Schema.optional(Ref.Ref(Milestone))                  -> union [Ref, Undefined]
  //   update: milestone: Schema.optional(Schema.NullOr(Ref.Ref(Milestone)))   -> union [Ref, Null, Undefined]
  // The nullable form exists only so a patch can CLEAR the field, so the cost of the gap is that a
  // field can be cleared but never set.

  const Target = Type.makeObject(DXN.make('com.example.type.target', '0.1.0'))(Schema.Struct({ title: Schema.String }));

  // The handler contract in both cases: a ref field arrives as a live `Ref`, never as the wire
  // envelope. Declared twice rather than through a factory so each `input` keeps its own inferred
  // type and the handler is checked against it.
  const decodedHandler = Effect.fnUntraced(function* ({ milestone }: { readonly milestone?: unknown }) {
    return { decoded: Ref.isRef(milestone) };
  });

  // `Schema.optional(Ref)` -> union [Ref, Undefined] -> one non-undefined branch -> recursed into.
  const Optional = Operation.make({
    meta: { key: DXN.make('com.example.operation.optionalRef'), name: 'Optional Ref' },
    services: [Database.Service],
    input: Schema.Struct({ milestone: Schema.optional(Ref.Ref(Target)) }),
    output: Schema.Struct({ decoded: Schema.Boolean }),
  }).pipe(Operation.withHandler(decodedHandler));

  // `Schema.optional(Schema.NullOr(Ref))` -> union [Ref, Null, Undefined] -> two non-undefined
  // branches -> `decodeRefsFromSchema` returns the value untouched.
  const OptionalNullable = Operation.make({
    meta: { key: DXN.make('com.example.operation.optionalNullableRef'), name: 'Optional Nullable Ref' },
    services: [Database.Service],
    input: Schema.Struct({ milestone: Schema.optional(Schema.NullOr(Ref.Ref(Target))) }),
    output: Schema.Struct({ decoded: Schema.Boolean }),
  }).pipe(Operation.withHandler(decodedHandler));

  // Conversion is what is under test, not resolution, so the envelope need only be well-formed:
  // `decodeRefsFromSchema` builds the `Ref` from the URI without loading the target.
  const envelope = () => ({ '/': `echo:///${EntityId.random()}` });

  const invokeWithEnvelope = async (op: Operation.WithHandler<Operation.Definition.Any>, data: unknown) => {
    const { peer, services } = await openPeer();
    // A db must be reachable from the context: `wrapFunctionHandler` skips ref decoding entirely
    // when `funcContext.db` is unset, which would hide the difference being tested.
    const db = await peer.createDatabase();

    return wrapFunctionHandler(op).handler({
      data,
      context: { services, spaceId: db.spaceId, spaceKey: db.spaceKey.toHex(), spaceRootUrl: db.rootUrl },
    });
  };

  test('decodes an encoded reference for an optional ref field', async ({ expect }) => {
    await expect(invokeWithEnvelope(Optional, { milestone: envelope() })).resolves.toEqual({ decoded: true });
  });

  // Same envelope, same target, same handler — the only difference is that the field may also be
  // null. Fails today: the envelope reaches the type-side check unconverted and is rejected as
  // `Expected <Declaration>`, so a nullable ref field cannot be SET over the wire at all.
  test('decodes an encoded reference for an optional NULLABLE ref field', async ({ expect }) => {
    await expect(invokeWithEnvelope(OptionalNullable, { milestone: envelope() })).resolves.toEqual({ decoded: true });
  });

  // Clearing still works, which is what makes the gap easy to miss: the null branch needs no
  // conversion, so the only broken case is the one that carries a reference.
  test('clears a nullable ref field', async ({ expect }) => {
    await expect(invokeWithEnvelope(OptionalNullable, { milestone: null })).resolves.toEqual({ decoded: false });
  });

  // The message is the whole diagnostic a remote caller gets: it cannot see its own payload in our
  // logs, so a rejection naming neither the expected type nor the value it sent is unactionable.
  test('names the expected type and the rejected value when a ref field is malformed', async ({ expect }) => {
    const error = await invokeWithEnvelope(Optional, { milestone: 42 }).then(
      () => undefined,
      (err: any) => err,
    );

    expect(error).toBeDefined();
    expect(error.message).toContain('Ref<');
    expect(error.message).toContain('com.example.type.target');
    expect(error.message).toContain('42');
    expect(error.message).toContain('["milestone"]');
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

/**
 * A live peer with its host services bridged in-process, the way `createFunctionContext` bridges
 * the EDGE bindings — so the runtime builds its own client and graph exactly as the worker does.
 */
const openPeer = async () => {
  const builder = new EchoTestBuilder();
  await builder.open();
  onTestFinished(async () => {
    await builder.close();
  });
  const peer = await builder.createPeer();
  const scope = Effect.runSync(Scope.make());
  onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));
  const services: FunctionProtocol.Context['services'] = await EffectEx.runPromise(
    Effect.all({
      dataService: makeInProcessClient(DataService.Rpcs, peer.host.dataService),
      queryService: makeInProcessClient(QueryService.Rpcs, peer.host.queryService),
      queueService: makeInProcessClient(FeedService.Rpcs, peer.host.feedService),
    }).pipe(Effect.provideService(Scope.Scope, scope)),
  );
  return { peer, services };
};
