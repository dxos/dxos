//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';

/** Lifecycle of a tracked task (a pipeline run, a benchmark stage, …). */
export type TaskStatus = 'pending' | 'running' | 'done' | 'error';

/** Live progress for one task: `current`/`total` is the item (e.g. message) index. */
export type TaskProgress = {
  readonly name: string;
  readonly label?: string;
  readonly current: number;
  readonly total?: number;
  readonly status: TaskStatus;
  readonly startedAt?: string;
  readonly updatedAt: string;
  readonly elapsedMs?: number;
  readonly note?: string;
  readonly error?: string;
};

export type ProgressSnapshot = {
  readonly updatedAt: string;
  readonly tasks: readonly TaskProgress[];
};

/** Handle for updating one task; returned by {@link ProgressApi.task}. */
export interface TaskHandle {
  /** Advance the item index by `by` (default 1). */
  readonly advance: (by?: number) => void;
  /** Set the absolute item index. */
  readonly set: (current: number) => void;
  readonly note: (text: string) => void;
  readonly done: () => void;
  readonly fail: (error: string) => void;
}

/**
 * A live progress registry, collected by the pipeline itself (via {@link Stage.track}). It is
 * subscribable — every mutation notifies listeners, so a reactive consumer (e.g. a browser panel)
 * updates instantly while file/log sinks throttle. Sibling of the (post-hoc) `Metrics` sink.
 */
export interface ProgressApi {
  /** Registers (or resumes) a task and marks it running; returns a handle to update it. */
  readonly task: (name: string, options?: { total?: number; label?: string }) => TaskHandle;
  /** Pre-registers tasks as `pending` (so an orchestrator can show the full list up front). */
  readonly seed: (tasks: readonly { name: string; total?: number; label?: string }[]) => void;
  readonly snapshot: () => ProgressSnapshot;
  /** Subscribe to snapshots; returns an unsubscribe. The listener fires on every change. */
  readonly subscribe: (listener: (snapshot: ProgressSnapshot) => void) => () => void;
}

export class Progress extends Context.Tag('@dxos/pipeline/Progress')<Progress, ProgressApi>() {
  /** A fresh in-memory registry. */
  static layer: Layer.Layer<Progress> = Layer.sync(Progress, () => make());
}

type MutableTask = {
  name: string;
  label?: string;
  current: number;
  total?: number;
  status: TaskStatus;
  startedAt?: string;
  updatedAt: string;
  elapsedMs?: number;
  note?: string;
  error?: string;
};

/** Construct a standalone progress registry (also usable directly, without the layer). */
export const make = (): ProgressApi => {
  const tasks = new Map<string, MutableTask>();
  const listeners = new Set<(snapshot: ProgressSnapshot) => void>();
  const now = (): string => new Date().toISOString();

  const snapshot = (): ProgressSnapshot => ({
    updatedAt: now(),
    tasks: [...tasks.values()].map((task) => ({ ...task })),
  });

  const emit = (): void => {
    if (listeners.size > 0) {
      const current = snapshot();
      for (const listener of listeners) {
        listener(current);
      }
    }
  };

  const touch = (task: MutableTask, mutate: (task: MutableTask) => void): void => {
    mutate(task);
    task.updatedAt = now();
    if (task.startedAt) {
      task.elapsedMs = Date.parse(task.updatedAt) - Date.parse(task.startedAt);
    }
    emit();
  };

  const task: ProgressApi['task'] = (name, options = {}) => {
    const started = now();
    const entry: MutableTask = tasks.get(name) ?? { name, current: 0, status: 'pending', updatedAt: started };
    entry.label = options.label ?? entry.label;
    entry.total = options.total ?? entry.total;
    entry.status = 'running';
    entry.startedAt = entry.startedAt ?? started;
    entry.updatedAt = started;
    tasks.set(name, entry);
    emit();
    return {
      advance: (by = 1) => touch(entry, (item) => (item.current += by)),
      set: (current) => touch(entry, (item) => (item.current = current)),
      note: (text) => touch(entry, (item) => (item.note = text)),
      done: () => touch(entry, (item) => (item.status = 'done')),
      fail: (error) => touch(entry, (item) => ((item.status = 'error'), (item.error = error))),
    };
  };

  const seed: ProgressApi['seed'] = (defs) => {
    for (const def of defs) {
      if (!tasks.has(def.name)) {
        tasks.set(def.name, {
          name: def.name,
          label: def.label,
          total: def.total,
          current: 0,
          status: 'pending',
          updatedAt: now(),
        });
      }
    }
    emit();
  };

  const subscribe: ProgressApi['subscribe'] = (listener) => {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  };

  return { task, seed, snapshot, subscribe };
};
