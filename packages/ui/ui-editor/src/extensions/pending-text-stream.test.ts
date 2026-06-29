//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Scheduler, PendingTextStreamer, memoryPendingTextSink } from './pending-text-stream';

// Deterministic fake clock: `advance` runs due timers in time order (including timers they schedule).
const createFakeScheduler = (): Scheduler & { advance: (ms: number) => void } => {
  let now = 0;
  let seq = 0;
  const timers = new Map<number, { time: number; fn: () => void }>();
  return {
    setTimeout: (fn, ms) => {
      const id = ++seq;
      timers.set(id, { time: now + ms, fn });
      return id;
    },
    clearTimeout: (handle) => {
      timers.delete(handle as number);
    },
    advance: (ms) => {
      now += ms;
      let ran = true;
      while (ran) {
        ran = false;
        const due = [...timers].filter(([, t]) => t.time <= now).sort((a, b) => a[1].time - b[1].time);
        if (due.length > 0) {
          const [id, timer] = due[0];
          timers.delete(id);
          timer.fn();
          ran = true;
        }
      }
    },
  };
};

// Flush pending microtasks (postProcess awaits its callback).
const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('PendingTextStreamer', () => {
  test('holds text until the initial buffer elapses', ({ expect }) => {
    const scheduler = createFakeScheduler();
    const sink = memoryPendingTextSink();
    const streamer = new PendingTextStreamer(sink, { initialBufferMs: 1000, scheduler });

    streamer.start({ placeholder: 'Recording…' });
    streamer.push('hello world');
    expect(sink.snapshot()).toMatchObject({ final: '', placeholder: 'Recording…' });

    scheduler.advance(1000);
    expect(sink.snapshot().final).toBe('hello world');
  });

  test('batch mode reveals each chunk immediately when unbuffered', ({ expect }) => {
    const scheduler = createFakeScheduler();
    const sink = memoryPendingTextSink();
    const streamer = new PendingTextStreamer(sink, { scheduler });

    streamer.start();
    streamer.push('hello');
    streamer.push('world');
    expect(sink.snapshot().final).toBe('hello world');
  });

  test('word mode reveals one word per interval', ({ expect }) => {
    const scheduler = createFakeScheduler();
    const sink = memoryPendingTextSink();
    const streamer = new PendingTextStreamer(sink, { mode: 'word', wordIntervalMs: 100, scheduler });

    streamer.start();
    streamer.push('one two three');
    expect(sink.snapshot().final).toBe('one');
    scheduler.advance(100);
    expect(sink.snapshot().final).toBe('one two');
    scheduler.advance(100);
    expect(sink.snapshot().final).toBe('one two three');
  });

  test('post-processes the finalized buffer once it settles', async ({ expect }) => {
    const scheduler = createFakeScheduler();
    const sink = memoryPendingTextSink();
    const streamer = new PendingTextStreamer(sink, {
      postProcessDebounceMs: 500,
      postProcess: (text) => text.toUpperCase(),
      scheduler,
    });

    streamer.start();
    streamer.push('hello world');
    expect(sink.snapshot().final).toBe('hello world');

    scheduler.advance(500);
    await flushMicrotasks();
    expect(sink.snapshot().final).toBe('HELLO WORLD');
  });

  test('flush reveals queued words and runs post-process immediately', async ({ expect }) => {
    const scheduler = createFakeScheduler();
    const sink = memoryPendingTextSink();
    const streamer = new PendingTextStreamer(sink, {
      mode: 'word',
      wordIntervalMs: 100,
      postProcess: (text) => `[${text}]`,
      scheduler,
    });

    streamer.start();
    streamer.push('alpha beta gamma');
    expect(sink.snapshot().final).toBe('alpha');

    void streamer.flush();
    expect(sink.snapshot().final).toBe('alpha beta gamma');
    await flushMicrotasks();
    expect(sink.snapshot().final).toBe('[alpha beta gamma]');
  });

  test('awaiting flush() resolves only after async post-process settles (drain contract)', async ({ expect }) => {
    const sink = memoryPendingTextSink();
    const streamer = new PendingTextStreamer(sink, {
      mode: 'batch',
      postProcess: async (text) => `[${text}]`,
    });

    streamer.start();
    streamer.push('alpha beta');
    // Drain: a single await must guarantee the post-process pass has applied.
    await streamer.flush();
    expect(sink.snapshot().final).toBe('[alpha beta]');
  });
});
