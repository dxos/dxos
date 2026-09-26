//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as KeyValueStore from 'effect/unstable/persistence/KeyValueStore';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { SpaceId } from '@dxos/keys';

import * as ProcessManager from './ProcessManager.ts';
import * as QueuedRemoteControl from './QueuedRemoteControl.ts';
import * as RemoteProcessManager from './RemoteProcessManager.ts';
import { LocalRemoteHost } from './testing/index.ts';

/**
 * End-to-end test of the queued remote control, with a SECOND local process manager standing in for
 * the remote runtime and a cuttable channel between the two.
 *
 * Each test asserts on what the host ended up with — which processes exist there, which inputs it
 * applied and how many times — rather than on calls into a mock, which is the only way the
 * at-least-once queue plus at-most-once host can be shown to compose into exactly-once.
 */
describe('queued remote control (e2e against a local host)', () => {
  it.live(
    'a spawn issued while the channel is cut appears as STARTING and reaches the host on resume',
    Effect.fn(function* ({ expect }) {
      yield* withHarness(({ client, host, link }) =>
        Effect.gen(function* () {
          yield* link.cut;
          const snapshot = yield* client.spawn({ spaceId: SPACE, key: EchoProcess.key, name: 'queued' });
          expect(snapshot.state).toEqual(Process.State.STARTING);
          // Reads fall back to the local view, so the process is visible before the host knows of it.
          expect((yield* client.list({ spaceId: SPACE })).map((info) => info.state)).toEqual([Process.State.STARTING]);
          expect(yield* host.list({ spaceId: SPACE })).toEqual([]);

          yield* link.resume;
          yield* client.connected;
          yield* client.drained;

          const hosted = yield* host.list({ spaceId: SPACE });
          expect(hosted.length).toEqual(1);
          expect(hosted[0].key).toEqual(EchoProcess.key);
          // The client's own read now reports the host's state, through the local->host pid alias.
          expect((yield* client.status({ spaceId: SPACE, pid: snapshot.pid })).state).toEqual(Process.State.IDLE);
        }),
      );
    }),
  );

  it.live(
    'a process whose spawn was never delivered is still queryable, as STARTING',
    Effect.fn(function* ({ expect }) {
      yield* withHarness(({ client, host, link }) =>
        Effect.gen(function* () {
          yield* link.cut;
          const { pid } = yield* client.spawn({ spaceId: SPACE, key: EchoProcess.key, name: 'undelivered' });

          // Every read a caller can make must answer for a process the host has never heard of —
          // the host would 404 the pid, and a client that surfaced that would lose the process the
          // user just spawned.
          const status = yield* client.status({ spaceId: SPACE, pid });
          expect(status.state).toEqual(Process.State.STARTING);
          expect(status.key).toEqual(EchoProcess.key);
          expect(status.params.name).toEqual('undelivered');

          const listed = yield* client.list({ spaceId: SPACE });
          expect(listed.map((info) => [info.pid, info.state])).toEqual([[pid, Process.State.STARTING]]);
          // Filters apply to the local view as they do to the host's.
          expect(yield* client.list({ spaceId: SPACE, state: Process.State.IDLE })).toEqual([]);
          expect((yield* client.list({ spaceId: SPACE, key: EchoProcess.key })).length).toEqual(1);

          // No host process means no events, but the page still carries the state at read time.
          const page = yield* client.readEvents({ spaceId: SPACE, pid, cursor: 0 });
          expect(page.events).toEqual([]);
          expect(page.snapshot.state).toEqual(Process.State.STARTING);

          // And none of that reached the host, which is what "never delivered" means.
          expect(yield* host.list({ spaceId: SPACE })).toEqual([]);
        }),
      );
    }),
  );

  it.live(
    'inputs submitted while cut are buffered and applied in order once the host is reachable',
    Effect.fn(function* ({ expect }) {
      yield* withHarness(({ client, host, link }) =>
        Effect.gen(function* () {
          yield* link.cut;
          const snapshot = yield* client.spawn({ spaceId: SPACE, key: EchoProcess.key });
          yield* client.submitInput({ spaceId: SPACE, pid: snapshot.pid, input: 'one' });
          yield* client.submitInput({ spaceId: SPACE, pid: snapshot.pid, input: 'two' });
          expect((yield* client.pending).map((command) => command.payload._tag)).toEqual([
            'spawn',
            'submitInput',
            'submitInput',
          ]);
          expect(yield* host.applied).toEqual([]);

          yield* link.resume;
          yield* client.connected;
          yield* client.drained;

          expect((yield* host.applied).map((entry) => entry.input)).toEqual(['one', 'two']);
        }),
      );
    }),
  );

  it.live(
    'a terminate is TERMINATING at once and drops the queued inputs behind it',
    Effect.fn(function* ({ expect }) {
      yield* withHarness(({ client, host, link }) =>
        Effect.gen(function* () {
          // Spawned and delivered first, so there is a real host process to terminate.
          const snapshot = yield* client.spawn({ spaceId: SPACE, key: EchoProcess.key });
          yield* client.drained;

          yield* link.cut;
          yield* client.submitInput({ spaceId: SPACE, pid: snapshot.pid, input: 'never-applied' });
          yield* client.terminate({ spaceId: SPACE, pid: snapshot.pid });
          expect((yield* client.status({ spaceId: SPACE, pid: snapshot.pid })).state).toEqual(
            Process.State.TERMINATING,
          );

          yield* link.resume;
          yield* client.connected;
          yield* client.drained;

          const hosted = yield* host.list({ spaceId: SPACE });
          expect(hosted[0].state).toEqual(Process.State.TERMINATED);
          // The queued input was delivered before the terminate (order is preserved), but nothing is
          // left queued for a process that no longer exists.
          expect(yield* client.pending).toEqual([]);
        }),
      );
    }),
  );

  it.live(
    'terminating a process whose spawn never left the client drops the whole group',
    Effect.fn(function* ({ expect }) {
      yield* withHarness(({ client, host, link }) =>
        Effect.gen(function* () {
          yield* link.cut;
          const snapshot = yield* client.spawn({ spaceId: SPACE, key: EchoProcess.key });
          yield* client.submitInput({ spaceId: SPACE, pid: snapshot.pid, input: 'abandoned' });
          yield* client.terminate({ spaceId: SPACE, pid: snapshot.pid });

          // Nothing to terminate on the host, so nothing should ever be sent there — and the client
          // forgets it rather than keeping a TERMINATED snapshot only this session could see.
          expect(yield* client.pending).toEqual([]);
          expect(yield* client.list({ spaceId: SPACE })).toEqual([]);

          yield* link.resume;
          yield* client.connected;
          yield* client.drained;
          expect(yield* host.list({ spaceId: SPACE })).toEqual([]);
          expect(yield* host.applied).toEqual([]);
        }),
      );
    }),
  );

  it.live(
    'a process the host keeps rejecting does not hold up another process, and keeps its own commands',
    Effect.fn(function* ({ expect }) {
      yield* withHarness(
        ({ client, host }) =>
          Effect.gen(function* () {
            // The host hosts no such process, so every delivery for it is rejected — the failure an
            // outage cannot be told apart from, and the one that must not become head-of-line.
            const doomed = yield* client.spawn({ spaceId: SPACE, key: 'test.not-hosted', name: 'doomed' });
            // Queued BEHIND it, for a different process.
            yield* client.spawn({ spaceId: SPACE, key: EchoProcess.key, name: 'other' });

            // Ordering is per process, so the second spawn overtakes the first rather than waiting
            // on it — which under a single global order it never could.
            yield* waitUntil(
              Effect.map(host.list({ spaceId: SPACE }), (hosted) =>
                hosted.some((info) => info.params.name === 'other'),
              ),
            );

            // The doomed process keeps its command rather than having it discarded, and keeps
            // reporting the only state the client can honestly claim for it.
            expect((yield* client.pending).map((command) => command.localPid)).toEqual([doomed.pid]);
            expect((yield* client.status({ spaceId: SPACE, pid: doomed.pid })).state).toEqual(Process.State.STARTING);

            // And terminating it is what actually releases the queue, since only the caller knows
            // the process is not wanted any more.
            yield* client.terminate({ spaceId: SPACE, pid: doomed.pid });
            expect(yield* client.pending).toEqual([]);
            // The other process is untouched by any of this — it is on the host and stays there.
            expect((yield* client.list({ spaceId: SPACE })).map((info) => info.params.name)).toEqual(['other']);
          }),
        // Fast backoff so the losing process cycles quickly; nothing here depends on its timing.
        { backoff: { initial: Duration.millis(1), max: Duration.millis(5) } },
      );
    }),
  );

  it.live(
    'a delivery whose acknowledgement is lost is retried without being applied twice',
    Effect.fn(function* ({ expect }) {
      yield* withHarness(({ client, host, link }) =>
        Effect.gen(function* () {
          const snapshot = yield* client.spawn({ spaceId: SPACE, key: EchoProcess.key });
          yield* client.drained;

          // The host applies the input, then the channel dies before the client hears back.
          yield* link.dropAcks(true);
          yield* client.submitInput({ spaceId: SPACE, pid: snapshot.pid, input: 'once' });
          yield* waitUntil(host.applied.pipe(Effect.map((applied) => applied.length === 1)));

          yield* link.dropAcks(false);
          yield* client.connected;
          yield* client.drained;

          // Redelivered under the same idempotency key, so the host recognised and ignored it.
          expect((yield* host.applied).map((entry) => entry.input)).toEqual(['once']);
          expect(yield* host.duplicates).toBeGreaterThan(0);
        }),
      );
    }),
  );

  it.live(
    'a spawn re-issued under the same idempotency key resolves to the process already queued',
    Effect.fn(function* ({ expect }) {
      yield* withHarness(({ client, host, link }) =>
        Effect.gen(function* () {
          yield* link.cut;
          const first = yield* client.spawn({ spaceId: SPACE, key: EchoProcess.key, idempotencyKey: 'agent-1' });
          const second = yield* client.spawn({ spaceId: SPACE, key: EchoProcess.key, idempotencyKey: 'agent-1' });
          expect(second.pid).toEqual(first.pid);
          expect((yield* client.pending).length).toEqual(1);

          yield* link.resume;
          yield* client.connected;
          yield* client.drained;
          expect((yield* host.list({ spaceId: SPACE })).length).toEqual(1);
        }),
      );
    }),
  );

  it.live(
    'a queue persisted before a reload is delivered by the client that comes back',
    Effect.fn(function* ({ expect }) {
      yield* withHarness(({ client, host, link, clientStore, reload }) =>
        Effect.gen(function* () {
          yield* link.cut;
          const snapshot = yield* client.spawn({ spaceId: SPACE, key: EchoProcess.key, idempotencyKey: 'agent-1' });
          yield* client.submitInput({ spaceId: SPACE, pid: snapshot.pid, input: 'survives' });

          // A second client over the same store and the same host: the reload.
          const reloaded = yield* reload(clientStore);
          // The command log came back with the process still STARTING.
          expect((yield* reloaded.pending).map((command) => command.payload._tag)).toEqual(['spawn', 'submitInput']);
          expect((yield* reloaded.status({ spaceId: SPACE, pid: snapshot.pid })).state).toEqual(Process.State.STARTING);

          yield* link.resume;
          yield* reloaded.connected;
          yield* reloaded.drained;
          expect((yield* host.applied).map((entry) => entry.input)).toEqual(['survives']);
        }),
      );
    }),
  );

  it.live(
    'a failing delivery is retried on a backoff without the connection signal',
    Effect.fn(function* ({ expect }) {
      yield* withHarness(
        ({ client, host, link }) =>
          Effect.gen(function* () {
            yield* link.cut;
            yield* client.spawn({ spaceId: SPACE, key: EchoProcess.key });
            yield* waitUntil(link.refusals.pipe(Effect.map((count) => count >= 2)));

            yield* link.resume;
            yield* client.drained;
            expect((yield* host.list({ spaceId: SPACE })).length).toEqual(1);
          }),
        // Short backoff: nothing here signals `connected`, so only the retry timer can make progress.
        { backoff: { initial: Duration.millis(5), max: Duration.millis(20) } },
      );
    }),
  );

  it.live(
    'the client manager built over the queue spawns and streams through it',
    Effect.fn(function* ({ expect }) {
      // The whole client stack — `makeControlVerbs` + `RemoteProcessHandle` — over the queued control,
      // so the queue is exercised through the surface callers actually hold.
      yield* withHarness(({ client, host }) =>
        Effect.gen(function* () {
          const registry = yield* Registry.AtomRegistry;
          const { spawn } = RemoteProcessManager.makeControlVerbs(client, registry, tree(registry));

          const handle = yield* spawn({ spaceId: SPACE, key: EchoProcess.key, definition: EchoProcess });
          yield* client.drained;
          yield* handle.submitInput('hello');
          yield* client.drained;

          expect((yield* host.applied).map((entry) => entry.input)).toEqual(['hello']);
        }),
      );
    }),
  );
});

const SPACE = SpaceId.random();

/** Long enough that only `connected` can end it — which is what makes the signal the thing under test. */
const BACKOFF = { initial: Duration.seconds(30), max: Duration.seconds(30) };

/** Echoes each input back as an output; the only part of a definition the remote path uses. */
const EchoProcess = Process.make(
  { key: 'test.queued-echo', input: Schema.String, output: Schema.String, services: [] },
  (ctx) =>
    Effect.succeed({
      onSpawn: () => Effect.void,
      onInput: (input: string) => Effect.sync(() => ctx.submitOutput(`echo:${input}`)),
      onAlarm: () => Effect.void,
      onChildEvent: () => Effect.void,
    }),
);

const tree = (registry: Registry.AtomRegistry) => {
  const atom = Atom.make<readonly Process.Info[]>([]);
  registry.mount(atom);
  return atom;
};

/** Polls a predicate; every wait in these tests is bounded by vitest's own timeout. */
const waitUntil = (predicate: Effect.Effect<boolean>): Effect.Effect<void> =>
  Effect.gen(function* () {
    while (!(yield* predicate)) {
      yield* Effect.sleep(Duration.millis(2));
    }
  });

/** Everything a test drives: the queued client, the host it pretends to reach, and the link between. */
interface Harness {
  readonly client: QueuedRemoteControl.Queued;
  readonly host: LocalRemoteHost.Host;
  readonly link: LocalRemoteHost.Link;
  /** The cuttable channel itself, for building a second client over the same link (the reload case). */
  readonly control: RemoteProcessManager.Control;
  /** The client's command store, so a reload can come back to the same queue. */
  readonly clientStore: KeyValueStore.KeyValueStore;
  /** Builds a further client over the same link and store; torn down with the harness. */
  readonly reload: (kvStore: KeyValueStore.KeyValueStore) => Effect.Effect<QueuedRemoteControl.Queued>;
}

/**
 * Runs `body` against a client + host + channel: two process managers in one process, the second
 * pretending to be the edge.
 *
 * Teardown is explicit and ordered — flushers first, then the host, then the layer's registry. A
 * flusher still retrying, or a host process still running, when the atom registry is disposed reports
 * as a failure in whichever test runs next.
 */
const withHarness = (
  body: (harness: Harness) => Effect.Effect<void, never, Registry.AtomRegistry | Scope.Scope>,
  options: { backoff?: QueuedRemoteControl.Backoff } = {},
) =>
  Effect.gen(function* () {
    const registry = yield* Registry.AtomRegistry;
    const resolver = yield* ServiceResolver.ServiceResolver;
    const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
    const traceSink = yield* Trace.TraceSink;
    const kv = yield* KeyValueStore.KeyValueStore;

    // The "remote" runtime: an ordinary manager over its own store.
    const hostManager = new ProcessManager.Impl({
      registry,
      kvStore: KeyValueStore.prefix(kv, 'host/'),
      traceSink,
      serviceResolver: resolver,
      handlerSet,
      idGenerator: ProcessManager.UUIDProcessIdGenerator,
    });
    const host = yield* LocalRemoteHost.makeHost({ manager: hostManager, definitions: [EchoProcess] });
    const { control, link } = LocalRemoteHost.cuttable(host);

    // Clients live in a scope of their own so every flusher is stopped before the host is.
    const clients = yield* Scope.make();
    const makeClient = (kvStore: KeyValueStore.KeyValueStore) =>
      QueuedRemoteControl.make({
        control,
        kvStore,
        backoff: options.backoff ?? BACKOFF,
      }).pipe(Effect.provideService(Scope.Scope, clients));

    const clientStore = KeyValueStore.prefix(kv, 'client/');
    const client = yield* makeClient(clientStore);

    return yield* body({ client, host, link, control, clientStore, reload: makeClient }).pipe(
      Effect.ensuring(Scope.close(clients, Exit.void).pipe(Effect.andThen(hostManager.shutdown()))),
    );
  }).pipe(Effect.provide(TestLayer));

const TestLayer = Layer.mergeAll(
  Layer.succeed(ServiceResolver.ServiceResolver, ServiceResolver.empty),
  KeyValueStore.layerMemory,
  OperationHandlerSet.provide(OperationHandlerSet.empty),
  Registry.layer,
  Trace.layerNoop,
);
