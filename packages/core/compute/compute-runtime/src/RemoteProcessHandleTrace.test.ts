//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import { EffectEx } from '@dxos/effect';
import { SpaceId } from '@dxos/keys';

import * as RemoteProcessHandle from './RemoteProcessHandle';
import type * as RemoteProcessManager from './RemoteProcessManager';
import type * as RemoteTraceMonitor from './RemoteTraceMonitor';

/**
 * How a handle for a remotely hosted process delivers ephemeral trace.
 *
 * The distinction this covers is what a reader SEES DURING a turn. The host flushes its event ring
 * at the end of an invocation, so a subscription that pages that ring cannot show a turn arriving —
 * it renders whole, after the fact, however well the provider streamed. Given a live trace source
 * the handle replays what the host already has and then takes the rest as it is pushed.
 */
describe('RemoteProcessHandle ephemeral trace', () => {
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
    ({
      meta: { pid: TEST_PID },
      isEphemeral: true,
      events: [{ timestamp: 0, type: 'test.block', data: { text } }],
    }) as unknown as Trace.Message;

  /**
   * A host whose ring holds `buffered` and which never settles, so a polled subscription stays open
   * — the shape that makes the difference between the two paths observable.
   */
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

  const makeHandle = (control: RemoteProcessManager.Control, remoteTrace?: RemoteTraceMonitor.Monitor) =>
    Effect.gen(function* () {
      const registry = yield* Registry.AtomRegistry;
      return yield* RemoteProcessHandle.RemoteProcessHandle.make({
        info: snapshot(Process.State.RUNNING),
        control,
        spaceId: SPACE_ID,
        registry,
        ...(remoteTrace !== undefined ? { remoteTrace } : {}),
      });
    });

  const textsOf = (messages: readonly Trace.Message[]) =>
    messages.flatMap((message) => message.events.map((event) => (event.data as { text: string }).text));

  test('replays the buffered ring, then takes pushed messages', async ({ expect }) => {
    const pushed = [traceMessage('live-1'), traceMessage('live-2')];
    const remoteTrace: RemoteTraceMonitor.Monitor = {
      subscribeToTraceMessages: () => Stream.fromIterable(pushed),
    };

    const collected = await EffectEx.runPromise(
      Effect.gen(function* () {
        const handle = yield* makeHandle(makeControl([traceMessage('buffered')]), remoteTrace);
        return yield* Stream.runCollect(handle.subscribeEphemeral());
      }).pipe(Effect.provide(Layer.succeed(Registry.AtomRegistry, Registry.make()))),
    );

    // The replay comes first and the stream ENDS with the pushed messages: a reader attaching
    // mid-turn sees the history, then the turn as it happens.
    expect(textsOf([...collected])).toEqual(['buffered', 'live-1', 'live-2']);
  });

  test('reads the host once when pushed, rather than polling it', async ({ expect }) => {
    let reads = 0;
    const remoteTrace: RemoteTraceMonitor.Monitor = { subscribeToTraceMessages: () => Stream.empty };

    await EffectEx.runPromise(
      Effect.gen(function* () {
        const handle = yield* makeHandle(
          makeControl([traceMessage('buffered')], () => reads++),
          remoteTrace,
        );
        return yield* Stream.runCollect(handle.subscribeEphemeral());
      }).pipe(Effect.provide(Layer.succeed(Registry.AtomRegistry, Registry.make()))),
    );

    // One page, not a loop. The polled path would still be reading — the host above never settles,
    // which is the whole reason a turn cannot be watched through it.
    expect(reads).toBe(1);
  });

  test('falls back to polling the ring with no live source', async ({ expect }) => {
    // Unchanged behaviour where no swarm monitor is provided (local-only deployments, tests): the
    // subscription pages the ring, so it still delivers — just not until the host has flushed.
    const collected = await EffectEx.runPromise(
      Effect.gen(function* () {
        const handle = yield* makeHandle(makeControl([traceMessage('buffered')]));
        return yield* Stream.runCollect(handle.subscribeEphemeral().pipe(Stream.take(1)));
      }).pipe(Effect.provide(Layer.succeed(Registry.AtomRegistry, Registry.make()))),
    );

    expect(textsOf([...collected])).toEqual(['buffered']);
  });
});
