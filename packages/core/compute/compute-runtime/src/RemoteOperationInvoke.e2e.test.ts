//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { DXN, SpaceId } from '@dxos/keys';

import * as OperationProcess from './OperationProcess.ts';
import { ProcessManagerService } from './process-manager-service.ts';
import * as ProcessManager from './ProcessManager.ts';
import * as ProcessOperationInvoker from './ProcessOperationInvoker.ts';
import * as QueuedRemoteControl from './QueuedRemoteControl.ts';
import * as RemoteProcessManager from './RemoteProcessManager.ts';
import * as RemoteTraceMonitor from './RemoteTraceMonitor.ts';
import { LocalRemoteHost } from './testing/index.ts';
import * as UnifiedProcessManager from './UnifiedProcessManager.ts';

/**
 * `invoke(op, input, { on: 'edge' })` end to end, as an app runs it: the process-backed invoker over the
 * unified manager, whose remote half is the queued control in front of a second local manager standing
 * in for EDGE. Every case is bounded well inside the test timeout, since the bug it guards was a hang.
 */
describe('remote operation invocation (e2e against a local host)', () => {
  it.live(
    'returns the output of an operation the host runs',
    Effect.fn(function* ({ expect }) {
      yield* withInvoker({ hosted: true }, ({ invoker }) =>
        Effect.gen(function* () {
          expect(yield* invoker.invoke(Double, { value: 21 }, { on: 'edge', spaceId: SPACE })).toEqual(42);
        }),
      );
    }),
    10_000,
  );

  it.live(
    "fails with the host's rejection when it does not host the operation, instead of retrying forever",
    Effect.fn(function* ({ expect }) {
      yield* withInvoker({ hosted: false }, ({ invoker, client }) =>
        Effect.gen(function* () {
          const exit = yield* invoker.invoke(Double, { value: 1 }, { on: 'edge', spaceId: SPACE }).pipe(Effect.exit);
          expect(Exit.isFailure(exit)).toEqual(true);
          expect(messageOf(exit)).toContain(`does not host process '${DXN.getName(Double.meta.key)}'`);
          // Nothing is left for the flusher to retry.
          expect(yield* client.pending).toEqual([]);
        }),
      );
    }),
    10_000,
  );

  it.live(
    'fails once the acceptance bound passes when the host is unreachable, and drops the queued spawn',
    Effect.fn(function* ({ expect }) {
      yield* withInvoker({ hosted: true, remoteAcceptTimeout: Duration.millis(300) }, ({ invoker, client, link }) =>
        Effect.gen(function* () {
          yield* link.cut;
          const exit = yield* invoker.invoke(Double, { value: 1 }, { on: 'edge', spaceId: SPACE }).pipe(Effect.exit);
          expect(Exit.isFailure(exit)).toEqual(true);
          expect(messageOf(exit)).toContain('did not accept');
          // Abandoned rather than delivered later: a poll that gave up must not spawn on reconnect.
          expect(yield* client.pending).toEqual([]);
        }),
      );
    }),
    10_000,
  );
});

const SPACE = SpaceId.random();

const Double = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.remote.double'), name: 'Double' },
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Number,
});

const handlers = OperationHandlerSet.make(Double.pipe(Operation.withHandler(({ value }) => Effect.succeed(value * 2))));

const messageOf = (exit: Exit.Exit<unknown, unknown>): string =>
  Exit.isFailure(exit) ? String(Cause.squash(exit.cause)) : '';

const TestLayer = Layer.mergeAll(
  Layer.succeed(ServiceResolver.ServiceResolver, ServiceResolver.empty),
  KeyValueStore.layerMemory,
  OperationHandlerSet.provide(handlers),
  Registry.layer,
  Trace.layerNoop,
);

interface Harness {
  readonly invoker: ProcessOperationInvoker.ProcessOperationInvoker;
  readonly client: QueuedRemoteControl.Queued;
  readonly link: LocalRemoteHost.Link;
}

/**
 * Builds the client stack over a cuttable link to a host that runs `Double` as an operation process
 * when `hosted`, and knows no process at all otherwise — EDGE's answer for an operation it was never
 * given.
 */
const withInvoker = Effect.fn(
  function* (
    options: { hosted: boolean; remoteAcceptTimeout?: Duration.Duration },
    body: (harness: Harness) => Effect.Effect<void, unknown, Scope.Scope>,
  ) {
    const registry = yield* Registry.AtomRegistry;
    const resolver = yield* ServiceResolver.ServiceResolver;
    const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
    const traceSink = yield* Trace.TraceSink;
    const kv = yield* KeyValueStore.KeyValueStore;
    const makeManager = (prefix: string) =>
      new ProcessManager.Impl({
        registry,
        kvStore: KeyValueStore.prefix(kv, prefix),
        traceSink,
        serviceResolver: resolver,
        handlerSet,
        idGenerator: ProcessManager.UUIDProcessIdGenerator,
      });

    const hostManager = makeManager('host/');
    const host = yield* LocalRemoteHost.makeHost({
      manager: hostManager,
      definitions: options.hosted ? [OperationProcess.make(Double)] : [],
    });
    const { control, link } = LocalRemoteHost.cuttable(host);

    // Flushers stop before either manager shuts down; one still retrying reports in the next test.
    const clients = yield* Scope.make();
    const client = yield* QueuedRemoteControl.make({
      control,
      kvStore: KeyValueStore.prefix(kv, 'client/'),
      backoff: { initial: Duration.millis(5), max: Duration.millis(20) },
    }).pipe(Effect.provideService(Scope.Scope, clients));

    const remoteTree = Atom.make<readonly Process.Process[]>([]);
    registry.mount(remoteTree);
    const remote: RemoteProcessManager.Manager = {
      processTree: Effect.sync(() => registry.get(remoteTree)),
      processTreeAtom: remoteTree,
      control: client,
      ...RemoteProcessManager.makeControlVerbs(client, registry, remoteTree),
    };

    const localManager = makeManager('local/');
    const services = yield* Layer.build(
      UnifiedProcessManager.layer.pipe(
        Layer.provide(
          Layer.mergeAll(
            Layer.succeed(ProcessManagerService, localManager),
            Layer.succeed(RemoteProcessManager.Service, remote),
            RemoteTraceMonitor.layerNoop,
            Layer.succeed(Registry.AtomRegistry, registry),
          ),
        ),
      ),
    );
    const invoker = ProcessOperationInvoker.make({
      manager: Context.get(services, Process.ManagerService),
      ...(options.remoteAcceptTimeout !== undefined ? { remoteAcceptTimeout: options.remoteAcceptTimeout } : {}),
    });

    return yield* body({ invoker, client, link }).pipe(
      Effect.ensuring(
        Scope.close(clients, Exit.void).pipe(
          Effect.andThen(hostManager.shutdown()),
          Effect.andThen(localManager.shutdown()),
        ),
      ),
    );
  },
  Effect.scoped,
  Effect.provide(TestLayer),
);
