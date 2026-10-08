//
// Copyright 2026 DXOS.org
//

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, test } from 'vitest';

import { STAGE_MARK_PREFIX, mergeIntervals, outermostInstructions, readTraceWork } from './tracing.ts';

const PAGE = { pid: 1, tid: 1 };
const WORKER = { pid: 1, tid: 2 };

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** Writes events in Chrome's `{"traceEvents": [...]}` envelope, gzipped as the stream arrives. */
const writeTrace = (events: object[]): string => {
  const dir = mkdtempSync(path.join(tmpdir(), 'perf-trace-'));
  dirs.push(dir);
  const file = path.join(dir, 'trace.json.gz');
  writeFileSync(file, gzipSync(JSON.stringify({ traceEvents: events, metadata: {} })));
  return file;
};

const marks = (stage: string, from: number, to: number) => [
  { name: `${STAGE_MARK_PREFIX}${stage}:begin`, ph: 'R', ts: from, ...PAGE },
  { name: `${STAGE_MARK_PREFIX}${stage}:end`, ph: 'R', ts: to, ...PAGE },
];

const threads = [
  { name: 'thread_name', ph: 'M', args: { name: 'CrRendererMain' }, ...PAGE },
  { name: 'thread_name', ph: 'M', args: { name: 'DedicatedWorker thread' }, ...WORKER },
];

describe('readTraceWork', () => {
  test('counts restyles, layouts and forced layouts inside the stage window only', async ({ expect }) => {
    const file = writeTrace([
      ...threads,
      ...marks('open', 1_000, 2_000),
      {
        name: 'UpdateLayoutTree',
        cat: 'blink,devtools.timeline',
        ph: 'X',
        ts: 1_100,
        dur: 5,
        args: { elementCount: 40 },
        ...PAGE,
      },
      {
        name: 'UpdateLayoutTree',
        cat: 'blink,devtools.timeline',
        ph: 'X',
        ts: 1_200,
        dur: 5,
        args: { elementCount: 2 },
        ...PAGE,
      },
      // A layout inside a script event is forced; the one in the frame's own rendering step is not.
      { name: 'FunctionCall', cat: 'devtools.timeline', ph: 'X', ts: 1_300, dur: 100, ...PAGE },
      {
        name: 'Layout',
        cat: 'devtools.timeline',
        ph: 'X',
        ts: 1_350,
        dur: 10,
        args: { beginData: { dirtyObjects: 7 } },
        ...PAGE,
      },
      {
        name: 'Layout',
        cat: 'devtools.timeline',
        ph: 'X',
        ts: 1_500,
        dur: 10,
        args: { beginData: { dirtyObjects: 3 } },
        ...PAGE,
      },
      // Outside the window: the harness's own boundary reads.
      {
        name: 'Layout',
        cat: 'devtools.timeline',
        ph: 'X',
        ts: 2_500,
        dur: 10,
        args: { beginData: { dirtyObjects: 99 } },
        ...PAGE,
      },
    ]);

    const { counters } = await readTraceWork(file);
    expect(counters.get('open')?.render).toEqual({
      styleRecalcs: 2,
      styleRecalcElements: 42,
      layouts: 2,
      layoutDirtyObjects: 10,
      forcedLayouts: 1,
    });
  });

  test('task time counts only toplevel events, so devtools.timeline does not inflate it', async ({ expect }) => {
    const file = writeTrace([
      ...threads,
      ...marks('boot', 0, 10_000),
      { name: 'ThreadControllerImpl::RunTask', cat: 'toplevel', ph: 'X', ts: 100, dur: 3_000, ...WORKER },
      { name: 'FunctionCall', cat: 'devtools.timeline', ph: 'X', ts: 200, dur: 2_000, ...WORKER },
    ]);

    const { cpu } = await readTraceWork(file);
    expect(cpu.get('boot')).toEqual([{ kind: 'worker', name: 'worker:1/2', cpuMs: 3, samples: 1, idleSamples: 0 }]);
  });

  test('instructions sum the outermost toplevel tasks per realm', async ({ expect }) => {
    const file = writeTrace([
      ...threads,
      ...marks('turn', 0, 10_000),
      {
        name: 'ThreadControllerImpl::RunTask',
        cat: 'toplevel',
        ph: 'X',
        ts: 100,
        dur: 1_000,
        tidelta: 5_000,
        ...WORKER,
      },
      { name: 'Receive mojo message', cat: 'toplevel,mojom', ph: 'X', ts: 200, dur: 100, tidelta: 800, ...WORKER },
      { name: 'ThreadControllerImpl::RunTask', cat: 'toplevel', ph: 'X', ts: 2_000, dur: 10, tidelta: 300, ...PAGE },
    ]);

    const { counters } = await readTraceWork(file);
    expect(counters.get('turn')?.instructions).toEqual(
      expect.arrayContaining([
        { kind: 'worker', instructions: 5_000, threads: 1 },
        { kind: 'page', instructions: 300, threads: 1 },
      ]),
    );
  });

  test('no instruction deltas means no instruction threads, not zero instructions', async ({ expect }) => {
    const file = writeTrace([
      ...threads,
      ...marks('turn', 0, 10_000),
      { name: 'ThreadControllerImpl::RunTask', cat: 'toplevel', ph: 'X', ts: 100, dur: 1_000, ...WORKER },
    ]);

    const { counters } = await readTraceWork(file, { dataLoss: true });
    expect(counters.get('turn')?.instructions).toEqual([]);
    expect(counters.get('turn')?.dataLoss).toBe(true);
  });
});

describe('mergeIntervals', () => {
  test('merges nested and overlapping intervals into a sorted disjoint union', ({ expect }) => {
    expect(
      mergeIntervals([
        { from: 50, to: 60 },
        { from: 0, to: 10 },
        { from: 2, to: 4 },
        { from: 9, to: 20 },
      ]),
    ).toEqual([
      { from: 0, to: 20 },
      { from: 50, to: 60 },
    ]);
  });
});

describe('outermostInstructions', () => {
  test('skips tasks nested in an earlier one', ({ expect }) => {
    expect(
      outermostInstructions([
        { from: 0, to: 100, instructions: 10 },
        { from: 10, to: 20, instructions: 4 },
        { from: 100, to: 120, instructions: 1 },
      ]),
    ).toBe(11);
  });
});
