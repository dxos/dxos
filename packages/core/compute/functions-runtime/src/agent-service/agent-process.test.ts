//
// Copyright 2026 DXOS.org
//

import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';

import { Process } from '@dxos/compute';
import { storageServiceLayer } from '@dxos/compute-runtime';

import {
  AlarmManager,
  computeAlarmDelay,
  isAgentWorkPending,
  makeAlarmToolkit,
  parseContinueDecision,
  resolveWakeAt,
} from './agent-process';

const NOW = new Date('2026-06-04T12:00:00.000Z').getTime();

/** Builds a fresh in-memory storage service for a single test. */
const makeStorage = Effect.gen(function* () {
  const kvStore = yield* KeyValueStore.KeyValueStore;
  return storageServiceLayer(kvStore, 'agent/');
}).pipe(Effect.provide(KeyValueStore.layerMemory));

/** AlarmManager with a captured `setAlarm` and a fixed clock for deterministic assertions. */
const makeManager = Effect.fnUntraced(function* (now: number = NOW) {
  const storageService = yield* makeStorage;
  const alarmCalls: Array<number | undefined> = [];
  const alarmManager = new AlarmManager({
    storageService,
    setAlarm: (timeout) => alarmCalls.push(timeout),
    now: () => now,
  });
  return { alarmManager, alarmCalls, storageService };
});

describe('resolveWakeAt', () => {
  it('resolves an absolute "at" timestamp', ({ expect }) => {
    const at = '2026-06-04T18:00:00.000Z';
    const result = resolveWakeAt({ at }, NOW);
    expect(Either.isRight(result)).toBe(true);
    expect(Either.getOrThrow(result)).toBe(new Date(at).getTime());
  });

  it('resolves a relative "in" duration', ({ expect }) => {
    const result = resolveWakeAt({ in: '5 minutes' }, NOW);
    expect(Either.isRight(result)).toBe(true);
    expect(Either.getOrThrow(result)).toBe(NOW + 5 * 60 * 1000);
  });

  it('rejects an invalid "at" timestamp', ({ expect }) => {
    const result = resolveWakeAt({ at: 'not-a-date' }, NOW);
    expect(Either.isLeft(result)).toBe(true);
  });

  it('rejects an invalid "in" duration', ({ expect }) => {
    const result = resolveWakeAt({ in: 'whenever' }, NOW);
    expect(Either.isLeft(result)).toBe(true);
  });

  it('rejects specifying both "in" and "at"', ({ expect }) => {
    const result = resolveWakeAt({ in: '5 minutes', at: '2026-06-04T18:00:00.000Z' }, NOW);
    expect(Either.isLeft(result)).toBe(true);
  });

  it('rejects specifying neither "in" nor "at"', ({ expect }) => {
    const result = resolveWakeAt({}, NOW);
    expect(Either.isLeft(result)).toBe(true);
  });
});

describe('computeAlarmDelay', () => {
  it('wakes immediately when there is pending work', ({ expect }) => {
    expect(computeAlarmDelay({ hasPendingWork: true, wakeAt: NOW + 10_000, now: NOW })).toBe(0);
    expect(computeAlarmDelay({ hasPendingWork: true, wakeAt: null, now: NOW })).toBe(0);
  });

  it('schedules a future self-wake when idle', ({ expect }) => {
    expect(computeAlarmDelay({ hasPendingWork: false, wakeAt: NOW + 10_000, now: NOW })).toBe(10_000);
  });

  it('wakes immediately when a self-wake is already due', ({ expect }) => {
    expect(computeAlarmDelay({ hasPendingWork: false, wakeAt: NOW - 10_000, now: NOW })).toBe(0);
  });

  it('schedules nothing when idle and no self-wake is set', ({ expect }) => {
    expect(computeAlarmDelay({ hasPendingWork: false, wakeAt: null, now: NOW })).toBe(null);
  });
});

describe('AlarmManager', () => {
  it.effect(
    'tracks and persists the next self-wake, syncing with setAlarm',
    Effect.fnUntraced(function* ({ expect }) {
      const { alarmManager, alarmCalls, storageService } = yield* makeManager();

      yield* alarmManager.load();
      expect(alarmManager.wakeAt).toBe(null);

      yield* alarmManager.setWakeAt(NOW + 60_000);
      expect(alarmManager.wakeAt).toBe(NOW + 60_000);

      // Reconcile schedules the underlying process alarm for the self-wake delay.
      alarmManager.reconcile(false);
      expect(alarmCalls).toEqual([60_000]);

      // A new manager backed by the same storage recovers the persisted alarm.
      const recovered = new AlarmManager({ storageService, setAlarm: () => {}, now: () => NOW });
      yield* recovered.load();
      expect(recovered.wakeAt).toBe(NOW + 60_000);
    }),
  );

  it.effect(
    'reconcile prefers pending work over a future self-wake',
    Effect.fnUntraced(function* ({ expect }) {
      const { alarmManager, alarmCalls } = yield* makeManager();
      yield* alarmManager.setWakeAt(NOW + 60_000);

      alarmManager.reconcile(true);
      expect(alarmCalls).toEqual([0]);
    }),
  );

  it.effect(
    'reconcile schedules nothing when idle without a self-wake',
    Effect.fnUntraced(function* ({ expect }) {
      const { alarmManager, alarmCalls } = yield* makeManager();
      yield* alarmManager.load();

      alarmManager.reconcile(false);
      expect(alarmCalls).toEqual([]);
    }),
  );

  it.effect(
    'takeFiredAlarm clears and returns a due alarm, persisting the cleared state',
    Effect.fnUntraced(function* ({ expect }) {
      const { alarmManager, storageService } = yield* makeManager();
      yield* alarmManager.setWakeAt(NOW - 1_000);

      const firedAt = yield* alarmManager.takeFiredAlarm();
      expect(firedAt).toBe(NOW - 1_000);
      expect(alarmManager.wakeAt).toBe(null);

      const recovered = new AlarmManager({ storageService, setAlarm: () => {}, now: () => NOW });
      yield* recovered.load();
      expect(recovered.wakeAt).toBe(null);
    }),
  );

  it.effect(
    'takeFiredAlarm leaves a future alarm untouched',
    Effect.fnUntraced(function* ({ expect }) {
      const { alarmManager } = yield* makeManager();
      yield* alarmManager.setWakeAt(NOW + 60_000);

      const firedAt = yield* alarmManager.takeFiredAlarm();
      expect(firedAt).toBe(null);
      expect(alarmManager.wakeAt).toBe(NOW + 60_000);
    }),
  );
});

describe('AlarmToolkit handlers', () => {
  it.effect(
    'get-current-date returns the current time',
    Effect.fnUntraced(function* ({ expect }) {
      const { alarmManager } = yield* makeManager();
      const toolkit = makeAlarmToolkit(alarmManager);
      const handler = yield* toolkit.handlers;

      const { result } = yield* handler.handle('get-current-date', {} as never);
      expect(result).toBe(new Date(NOW).toISOString());
    }),
  );

  it.effect(
    'set-alarm with a relative duration records the self-wake',
    Effect.fnUntraced(function* ({ expect }) {
      const { alarmManager } = yield* makeManager();
      const toolkit = makeAlarmToolkit(alarmManager);
      const handler = yield* toolkit.handlers;

      const { result } = yield* handler.handle('set-alarm', { in: '5 minutes' } as never);
      const expectedWakeAt = NOW + 5 * 60 * 1000;
      expect(alarmManager.wakeAt).toBe(expectedWakeAt);
      expect(result).toContain(new Date(expectedWakeAt).toISOString());
    }),
  );

  it.effect(
    'set-alarm with an absolute time records the self-wake',
    Effect.fnUntraced(function* ({ expect }) {
      const { alarmManager } = yield* makeManager();
      const toolkit = makeAlarmToolkit(alarmManager);
      const handler = yield* toolkit.handlers;

      const at = '2026-06-04T18:00:00.000Z';
      yield* handler.handle('set-alarm', { at } as never);
      expect(alarmManager.wakeAt).toBe(new Date(at).getTime());
    }),
  );

  it.effect(
    'set-alarm with invalid input reports an error without scheduling',
    Effect.fnUntraced(function* ({ expect }) {
      const { alarmManager } = yield* makeManager();
      const toolkit = makeAlarmToolkit(alarmManager);
      const handler = yield* toolkit.handlers;

      const { result } = yield* handler.handle('set-alarm', { in: 'whenever' } as never);
      expect(result).toContain('Invalid');
      expect(alarmManager.wakeAt).toBe(null);
    }),
  );
});

// The completion decision (`maybeComplete` → `ctx.succeed()`) is exercised at two levels: the
// `isAgentWorkPending` suite below covers the predicate the process consults (queue / alarm /
// delegations / pending tool results), and `AgentService.test.ts` covers the process reaching a
// terminal state and respawning for a follow-up turn end-to-end.

describe('parseContinueDecision', () => {
  it('continues when the model says continue', ({ expect }) => {
    expect(parseContinueDecision('continue')).toBe(true);
    expect(parseContinueDecision('The agent should continue.')).toBe(true);
  });

  it('stops when the model says stop', ({ expect }) => {
    expect(parseContinueDecision('stop')).toBe(false);
    expect(parseContinueDecision('stop now')).toBe(false);
  });

  it('defaults to continue when ambiguous', ({ expect }) => {
    expect(parseContinueDecision('yes')).toBe(true);
    expect(parseContinueDecision('')).toBe(true);
  });
});

describe('isAgentWorkPending', () => {
  const makeSnapshot = (overrides: Partial<Parameters<typeof isAgentWorkPending>[0]> = {}) => {
    const storageService = Effect.runSync(makeStorage);
    const alarmManager = new AlarmManager({ storageService, setAlarm: () => {} });
    return {
      inputQueue: [],
      alarmManager,
      delegations: [],
      toolCallManager: {
        hasPendingToolResults: () => false,
      },
      ...overrides,
    } satisfies Parameters<typeof isAgentWorkPending>[0];
  };

  it('is idle when nothing is pending', ({ expect }) => {
    expect(isAgentWorkPending(makeSnapshot())).toBe(false);
  });

  it('is pending when the input queue has work', ({ expect }) => {
    expect(
      isAgentWorkPending(
        makeSnapshot({
          inputQueue: [{ _tag: 'prompt', content: 'hello' }],
        }),
      ),
    ).toBe(true);
  });

  it('is pending when a self-wake alarm is scheduled', ({ expect }) => {
    const snapshot = makeSnapshot();
    Effect.runSync(snapshot.alarmManager.setWakeAt(NOW + 60_000));
    expect(isAgentWorkPending(snapshot)).toBe(true);
  });

  it('is pending when subprocess delegations are in flight', ({ expect }) => {
    expect(
      isAgentWorkPending(
        makeSnapshot({
          delegations: [{ pid: Process.ID.make('child-1'), id: 'task-1' }],
        }),
      ),
    ).toBe(true);
  });

  it('is pending when tool results have not been delivered', ({ expect }) => {
    expect(
      isAgentWorkPending(
        makeSnapshot({
          toolCallManager: { hasPendingToolResults: () => true },
        }),
      ),
    ).toBe(true);
  });
});
