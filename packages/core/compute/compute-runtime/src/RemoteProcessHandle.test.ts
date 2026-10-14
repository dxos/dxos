//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Queue from 'effect/Queue';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import { Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { SpaceId } from '@dxos/keys';

import * as RemoteProcessHandle from './RemoteProcessHandle.ts';
import type * as RemoteProcessManager from './RemoteProcessManager.ts';
import * as RemoteTraceMonitor from './RemoteTraceMonitor.ts';

/**
 * How a handle for a remotely hosted process delivers ephemeral trace.
 *
 * The distinction this covers is what a reader SEES DURING a turn. The host flushes its event ring
 * at the end of an invocation, so a subscription that pages that ring cannot show a turn arriving —
 * it renders whole, after the fact, however well the provider streamed. Given a live trace source
 * the handle replays what the host already has and then takes the rest as it is pushed.
 */
describe('RemoteProcessHandle ephemeral trace', () => {
  test('replays the buffered ring, then takes pushed messages', async ({ expect }) => {
    const source = makeLiveSource();
    const collected = await EffectEx.runPromise(
      Effect.gen(function* () {
        const handle = yield* makeHandle(makeControl([traceMessage('buffered')]), source.monitor);
        return yield* Stream.runCollect(
          handle.subscribeEphemeral().pipe(
            // Pushed only once the replay has been consumed, so ordering is what is asserted rather
            // than a race between the two halves.
            Stream.tap((message) =>
              textsOf([message])[0] === 'buffered'
                ? Effect.sync(() => {
                    source.emit(traceMessage('live-1'));
                    source.emit(traceMessage('live-2'));
                  })
                : Effect.void,
            ),
            Stream.take(3),
          ),
        );
      }).pipe(Effect.provide(registryLayer())),
    );

    // The replay comes first and the stream CONTINUES with the pushed messages: a reader attaching
    // mid-turn sees the history, then the turn as it happens.
    expect(textsOf([...collected])).toEqual(['buffered', 'live-1', 'live-2']);
  });

  test('buffers a message pushed while the replay is still reading', async ({ expect }) => {
    const source = makeLiveSource();
    // Emitted from inside the host read: a subscription taken only after the replay finished would
    // never see this message, since the live source drops what no one is subscribed for.
    const control = makeControl([traceMessage('buffered')], () => source.emit(traceMessage('during-replay')));

    const collected = await EffectEx.runPromise(
      Effect.gen(function* () {
        const handle = yield* makeHandle(control, source.monitor);
        return yield* Stream.runCollect(handle.subscribeEphemeral().pipe(Stream.take(2)));
      }).pipe(Effect.provide(registryLayer())),
    );

    expect(textsOf([...collected])).toEqual(['buffered', 'during-replay']);
  });

  test('reads the ring to its end when pushed, rather than polling it', async ({ expect }) => {
    let reads = 0;
    const source = makeLiveSource();

    await EffectEx.runPromise(
      Effect.gen(function* () {
        const handle = yield* makeHandle(
          makeControl([traceMessage('buffered')], () => reads++),
          source.monitor,
        );
        return yield* Stream.runCollect(
          handle.subscribeEphemeral().pipe(
            Stream.tap((message) =>
              textsOf([message])[0] === 'buffered' ? Effect.sync(() => source.emit(traceMessage('live'))) : Effect.void,
            ),
            Stream.take(2),
          ),
        );
      }).pipe(Effect.provide(registryLayer())),
    );

    // The page plus the empty page that ends the replay — bounded, not a loop. The polled path would
    // still be reading: the host above never settles, which is the whole reason a turn cannot be
    // watched through it.
    expect(reads).toBe(2);
  });

  test('ends when the live source completes', async ({ expect }) => {
    // A monitor may hand back a finite stream, and the subscription has to end with it rather than
    // sit on the drained bridge queue.
    const collected = await EffectEx.runPromise(
      Effect.gen(function* () {
        const handle = yield* makeHandle(makeControl([traceMessage('buffered')]), {
          subscribeToTraceMessages: () => Stream.fromIterable([traceMessage('live')]),
        });
        return yield* Stream.runCollect(handle.subscribeEphemeral());
      }).pipe(Effect.provide(registryLayer()), Effect.timeout('5 seconds')),
    );

    expect(textsOf([...collected])).toEqual(['buffered', 'live']);
  });

  test('falls back to polling the ring when the monitor is the noop', async ({ expect }) => {
    // `layerNoop` says the deployment HAS no live source, so it must behave as if the tag were
    // unset. Taken as live, its empty stream ends the subscription as soon as the ring's replay is
    // drained — which, for a reader that subscribes before the turn it wants to watch, is before a
    // single event exists. That silently delivered nothing to every local-only deployment.
    const collected = await EffectEx.runPromise(
      Effect.gen(function* () {
        const handle = yield* makeHandle(makeControl([traceMessage('buffered')]), RemoteTraceMonitor.noopMonitor);
        return yield* Stream.runCollect(handle.subscribeEphemeral().pipe(Stream.take(1)));
      }).pipe(Effect.provide(registryLayer()), Effect.timeout('5 seconds')),
    );

    expect(textsOf([...collected])).toEqual(['buffered']);
  });

  test('falls back to polling the ring with no live source', async ({ expect }) => {
    // Unchanged behaviour where no swarm monitor is provided (local-only deployments, tests): the
    // subscription pages the ring, so it still delivers — just not until the host has flushed.
    const collected = await EffectEx.runPromise(
      Effect.gen(function* () {
        const handle = yield* makeHandle(makeControl([traceMessage('buffered')]));
        return yield* Stream.runCollect(handle.subscribeEphemeral().pipe(Stream.take(1)));
      }).pipe(Effect.provide(registryLayer())),
    );

    expect(textsOf([...collected])).toEqual(['buffered']);
  });
});

describe('RemoteProcessHandle event polling', () => {
  test('a failed read is retried rather than ending the subscription', async ({ expect }) => {
    let failures = 2;
    const healthy = makeControl([traceMessage('after-outage')]);
    const control: RemoteProcessManager.Control = {
      ...healthy,
      readEvents: (request) =>
        failures-- > 0 ? Effect.die(new Error('connection reset')) : healthy.readEvents(request),
    };
    const collected = await EffectEx.runPromise(
      Effect.gen(function* () {
        const handle = yield* makeHandle(control);
        return yield* Stream.runCollect(handle.subscribeEphemeral().pipe(Stream.take(1)));
      }).pipe(Effect.provide(registryLayer())),
    );

    expect(textsOf([...collected])).toEqual(['after-outage']);
  });

  test('a failed initial cursor read is retried before outputs are polled', async ({ expect }) => {
    let failures = 1;
    const control: RemoteProcessManager.Control = {
      ...makeControl([]),
      // The end cursor is read at `MAX_SAFE_INTEGER`; the output then lands at the cursor it returned.
      readEvents: ({ cursor }) =>
        cursor === Number.MAX_SAFE_INTEGER
          ? failures-- > 0
            ? Effect.die(new Error('connection reset'))
            : Effect.succeed({ events: [], cursor: 0, truncated: false, snapshot: snapshot(Process.State.RUNNING) })
          : Effect.succeed({
              events: cursor === 0 ? [{ _tag: 'output' as const, seq: 0, data: 'hello' }] : [],
              cursor: 1,
              truncated: false,
              snapshot: snapshot(Process.State.RUNNING),
            }),
    };
    const collected = await EffectEx.runPromise(
      Effect.gen(function* () {
        const handle = yield* makeHandle(control, undefined, Duration.millis(1), EchoOutput);
        return yield* Stream.runCollect(handle.subscribeOutputs().pipe(Stream.take(1)));
      }).pipe(Effect.provide(registryLayer())),
    );

    expect([...collected]).toEqual(['hello']);
  });

  test('an output that lands before the subscription starts is still read', async ({ expect }) => {
    // The host answers the input before the caller subscribes, as `Process.spawn` + `awaitOutput` do.
    const log = makeOutputLog([], Process.State.RUNNING, 'reply');
    const collected = await EffectEx.runPromise(
      Effect.gen(function* () {
        const handle = yield* makeHandle(log.control, undefined, Duration.millis(1), EchoOutput);
        yield* handle.submitInput(undefined);
        return yield* Stream.runCollect(handle.subscribeOutputs());
      }).pipe(Effect.provide(registryLayer())),
    );

    expect([...collected]).toEqual(['reply']);
  });

  test('an exited process replays its outputs to a late subscriber', async ({ expect }) => {
    const log = makeOutputLog(['earlier'], Process.State.SUCCEEDED);
    const collected = await EffectEx.runPromise(
      Effect.gen(function* () {
        const handle = yield* makeHandle(log.control, undefined, Duration.millis(1), EchoOutput);
        return yield* Stream.runCollect(handle.subscribeOutputs());
      }).pipe(Effect.provide(registryLayer())),
    );

    expect([...collected]).toEqual(['earlier']);
  });

  test('a host that stays unreachable still ends the subscription', async ({ expect }) => {
    const control: RemoteProcessManager.Control = {
      ...makeControl([]),
      readEvents: () => Effect.die(new Error('gone')),
    };
    const exit = await EffectEx.runPromise(
      Effect.gen(function* () {
        const handle = yield* makeHandle(control, undefined, Duration.millis(1));
        return yield* Stream.runCollect(handle.subscribeEphemeral()).pipe(Effect.exit);
      }).pipe(Effect.provide(registryLayer())),
    );

    expect(Exit.isFailure(exit)).toBe(true);
  });
});

const TEST_PID = Schema.decodeUnknownSync(Process.ID)('test-pid');
const SPACE_ID = SpaceId.random();

const snapshot = (state: Process.State): RemoteProcessManager.Snapshot => ({
  pid: TEST_PID,
  parentPid: null,
  key: 'org.dxos.test.process',
  params: { name: 'test', annotations: {} },
  environment: {},
  state,
  alarmDueAt: null,
  error: null,
  startedAt: 0,
  completedAt: Option.none(),
  metrics: { wallTime: 0, inputCount: 0, outputCount: 0 },
});

const traceMessage = (text: string): Trace.Message =>
  Obj.make(Trace.Message, {
    meta: { pid: TEST_PID },
    isEphemeral: true,
    events: [{ timestamp: 0, type: 'test.block', data: { text } }],
  });

/**
 * A host whose ring holds `buffered` and which never settles, so a polled subscription stays open
 * — the shape that makes the difference between the two paths observable.
 */
/** A host whose log holds only outputs; an input appends `reply` (when given) and ends the process. */
const makeOutputLog = (initial: readonly string[], initialState: Process.State, reply?: string) => {
  const outputs = [...initial];
  let state = initialState;
  const control: RemoteProcessManager.Control = {
    ...makeControl([]),
    status: () => Effect.sync(() => snapshot(state)),
    submitInput: () =>
      Effect.sync(() => {
        if (reply !== undefined) {
          outputs.push(reply);
        }
        state = Process.State.SUCCEEDED;
      }),
    readEvents: ({ cursor }) =>
      Effect.sync(() => ({
        events: outputs.slice(cursor).map((data, index) => ({ _tag: 'output' as const, seq: cursor + index, data })),
        cursor: Math.max(cursor === Number.MAX_SAFE_INTEGER ? outputs.length : cursor, outputs.length),
        truncated: false,
        snapshot: snapshot(state),
      })),
  };
  return { control };
};

const makeControl = (buffered: readonly Trace.Message[], onRead?: () => void): RemoteProcessManager.Control => ({
  spawn: () => Effect.sync(() => snapshot(Process.State.RUNNING)),
  list: () => Effect.sync(() => [snapshot(Process.State.RUNNING)]),
  status: () => Effect.sync(() => snapshot(Process.State.RUNNING)),
  submitInput: () => Effect.void,
  terminate: () => Effect.void,
  readEvents: ({ cursor }) =>
    Effect.sync(() => {
      onRead?.();
      const events = buffered
        .slice(cursor)
        .map((message, index) => ({ _tag: 'trace' as const, seq: cursor + index, message }));
      return { events, cursor: buffered.length, truncated: false, snapshot: snapshot(Process.State.RUNNING) };
    }),
  makeRpcClient: () => Effect.die('not used'),
});

/**
 * A live trace source that DROPS what no one is subscribed for, like the swarm it stands in for.
 * That is what makes "subscribed before the replay read" testable at all: a buffering fake would
 * deliver a message to a subscription taken afterwards and hide the defect.
 */
const makeLiveSource = () => {
  const listeners = new Set<(message: Trace.Message) => void>();
  const monitor: RemoteTraceMonitor.Monitor = {
    subscribeToTraceMessages: () =>
      Stream.unwrap(
        Effect.gen(function* () {
          const queue = yield* Effect.acquireRelease(Queue.unbounded<Trace.Message>(), (queue) =>
            Queue.shutdown(queue),
          );
          const listener = (message: Trace.Message) => {
            Queue.offerUnsafe(queue, message);
          };
          listeners.add(listener);
          yield* Effect.addFinalizer(() => Effect.sync(() => listeners.delete(listener)));
          return Stream.fromQueue(queue);
        }),
      ),
  };
  return {
    monitor,
    emit: (message: Trace.Message) => listeners.forEach((listener) => listener(message)),
  };
};

const registryLayer = () => Layer.succeed(Registry.AtomRegistry, Registry.make());

/** Supplies the output codec `subscribeOutputs` needs; the process itself never runs here. */
const EchoOutput = Operation.makeDurable({
  key: 'org.dxos.test.process',
  input: Schema.Void,
  output: Schema.String,
  services: [],
}).pipe(Operation.withDurableHandler(() => Effect.succeed({})));

const makeHandle = (
  control: RemoteProcessManager.Control,
  remoteTrace?: RemoteTraceMonitor.Monitor,
  pollInterval?: Duration.Duration,
  definition?: Operation.Durable<void, string, never, never>,
) =>
  Effect.gen(function* () {
    const registry = yield* Registry.AtomRegistry;
    return yield* RemoteProcessHandle.RemoteProcessHandle.make({
      info: snapshot(Process.State.RUNNING),
      control,
      spaceId: SPACE_ID,
      registry,
      ...(remoteTrace !== undefined ? { remoteTrace } : {}),
      ...(pollInterval !== undefined ? { pollInterval } : {}),
      ...(definition !== undefined ? { definition } : {}),
    });
  });

const textsOf = (messages: readonly Trace.Message[]) =>
  messages.flatMap((message) => message.events.map((event) => (event.data as { text: string }).text));
