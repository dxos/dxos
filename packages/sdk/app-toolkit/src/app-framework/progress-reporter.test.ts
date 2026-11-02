//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import * as Trace from '@dxos/compute/Trace';
import { Obj } from '@dxos/echo';

import { makeRegistry } from './progress-registry.ts';
import { makeReporter, withReporter } from './progress-reporter.ts';
import { makeTraceSink } from './progress-trace-sink.ts';

const KEY = 'board-uri#sync';

class SyncError extends Data.TaggedError('SyncError') {}

/** A meter fed by the real progress trace sink, and the writer a sync would report through. */
const setup = () => {
  const registry = Registry.make();
  const progress = makeRegistry(registry);
  const sink = makeTraceSink(progress, { stallTimeout: 0 });
  const writer: Trace.Writer = {
    write: (eventType, data) =>
      sink.write(
        Obj.make(Trace.Message, {
          meta: { pid: 'run-1' },
          isEphemeral: true,
          events: [{ type: eventType.key, timestamp: Date.now(), data }],
        }),
      ),
  };
  return { writer, task: () => registry.get(progress.monitorAtom(KEY)) };
};

describe('makeReporter', () => {
  test('shows the label at once, then a determinate count against the total', ({ expect }) => {
    const { writer, task } = setup();
    const reporter = makeReporter(writer, { key: KEY, label: 'Syncing Board' });
    expect(task()).toMatchObject({ label: 'Syncing Board', status: 'running', current: 0, total: undefined });

    reporter.total(3);
    reporter.advance();
    reporter.advance();
    expect(task()).toMatchObject({ current: 2, total: 3 });

    reporter.complete();
    expect(task()).toBeUndefined();
  });

  test('a count past the total raises the total rather than drawing past full', ({ expect }) => {
    const { writer, task } = setup();
    const reporter = makeReporter(writer, { key: KEY, label: 'Syncing' });
    reporter.total(1);
    reporter.advance(2);
    expect(task()).toMatchObject({ current: 2, total: 2 });
    reporter.total(1);
    expect(task()).toMatchObject({ current: 2, total: 2 });
  });

  test('a failed run stays on the meter as an error', ({ expect }) => {
    const { writer, task } = setup();
    makeReporter(writer, { key: KEY, label: 'Syncing' }).fail();
    expect(task()?.status).toBe('error');
  });
});

describe('withReporter', () => {
  const run = (writer: Trace.Writer, effect: Effect.Effect<void, SyncError>) =>
    Effect.runPromiseExit(
      withReporter({ key: KEY, label: 'Syncing' }, (reporter) =>
        Effect.sync(() => reporter.total(1)).pipe(Effect.andThen(effect)),
      ).pipe(Effect.provide(Layer.succeed(Trace.TraceService, writer))),
    );

  test('ends the meter as complete when the run succeeds', async ({ expect }) => {
    const { writer, task } = setup();
    await run(writer, Effect.void);
    expect(task()).toBeUndefined();
  });

  test('ends the meter as failed when the run fails', async ({ expect }) => {
    const { writer, task } = setup();
    await run(writer, Effect.fail(new SyncError()));
    expect(task()?.status).toBe('error');
  });
});
