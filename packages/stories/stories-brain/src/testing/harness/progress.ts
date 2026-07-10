//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { Progress, ProgressReporter } from '@dxos/pipeline';

import { PROGRESS_PATH } from './config';

/**
 * Merges a snapshot's tasks into the shared `progress.json` by task name (read-modify-write). Safe
 * because the suite runs sequentially — one writer at a time; a concurrent runner would need
 * per-process files or a lock.
 */
const writeProgressFile = (snapshot: Progress.ProgressSnapshot, path: string): void => {
  mkdirSync(dirname(path), { recursive: true });
  const existing: { tasks?: { name: string }[] } = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  const byName = new Map<string, unknown>((existing.tasks ?? []).map((task) => [task.name, task]));
  for (const task of snapshot.tasks) {
    byName.set(task.name, task);
  }
  writeFileSync(path, JSON.stringify({ updatedAt: snapshot.updatedAt, tasks: [...byName.values()] }, null, 2));
};

/** A file sink (Effect) for the `ProgressReporter` used by the `runItemsBench` pipeline path. */
export const progressFileSink =
  (path: string = PROGRESS_PATH): ProgressReporter.ProgressSink =>
  (snapshot) =>
    Effect.sync(() => writeProgressFile(snapshot, path));

/** Provides a `Progress` registry plus a throttled file reporter writing `progress.json`. */
export const progressReportingLayer = (path: string = PROGRESS_PATH): Layer.Layer<Progress.Progress> =>
  ProgressReporter.layer({ sink: progressFileSink(path), throttle: '1 second' }).pipe(
    Layer.provideMerge(Progress.Progress.layer),
  );

export type ProgressTask = {
  readonly advance: (by?: number) => void;
  readonly note: (text: string) => void;
  readonly done: () => void;
  readonly fail: (error: string) => void;
};

/**
 * A plain (non-Effect) progress task for the manual-loop tests (`extract-facts`, `html-vs-text`,
 * `brain-vs-rag`, …) that don't run through `runItemsBench`. It writes throttled snapshots to the
 * same shared `progress.json`, so every test reports live regardless of how it's structured.
 */
export const trackProgress = (name: string, total?: number, path: string = PROGRESS_PATH): ProgressTask => {
  const progress = Progress.make();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => writeProgressFile(progress.snapshot(), path);
  const unsubscribe = progress.subscribe(() => {
    if (!timer) {
      timer = setTimeout(() => {
        timer = undefined;
        flush();
      }, 500);
    }
  });
  const task = progress.task(name, { total, label: name });
  const finalize = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    flush();
    unsubscribe();
  };
  return {
    advance: (by) => task.advance(by),
    note: (text) => task.note(text),
    done: () => {
      task.done();
      finalize();
    },
    fail: (error) => {
      task.fail(error);
      finalize();
    },
  };
};
