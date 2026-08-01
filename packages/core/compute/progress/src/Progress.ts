//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/** Lifecycle of a tracked task (a pipeline run, a sync, a benchmark stage, …). */
export type TaskStatus = 'pending' | 'running' | 'done' | 'error';

/** Live progress for one task: `current`/`total` is the item (e.g. message) index. */
// TODO(burdon): Implement pause/resume functionality.
export type TaskProgress = {
  /** Stable key within a registry. */
  readonly name: string;
  /** Human display name, shown by UIs. */
  readonly label?: string;
  readonly current: number;
  readonly total?: number;
  readonly status: TaskStatus;
  readonly startedAt?: string;
  readonly updatedAt: string;
  readonly elapsedMs?: number;
  /** Producer-supplied estimate of remaining time (ms); see {@link deriveEta}. */
  readonly estimatedMs?: number;
  readonly note?: string;
  readonly error?: string;
  /** Whether the producer registered a cancel handler — UIs show a cancel control when true. */
  readonly cancellable?: boolean;
};

/** The registry's mutable working copy of a {@link TaskProgress} (drops `readonly` to mutate in place). */
type MutableTask = {
  -readonly [Key in keyof TaskProgress]: TaskProgress[Key];
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
  /** Set (or revise) the expected total. */
  readonly total: (total: number) => void;
  /** Set the producer's estimate of remaining time (ms). */
  readonly estimate: (remainingMs: number) => void;
  readonly note: (text: string) => void;
  readonly done: () => void;
  readonly fail: (error: string) => void;
  /** Remove this task from the registry (e.g. when a transient monitor completes). */
  readonly remove: () => void;
}

/**
 * A live progress registry. It is subscribable — every mutation notifies listeners, so a reactive
 * consumer (e.g. a browser panel) updates instantly while file/log sinks throttle.
 */
export interface ProgressApi {
  /**
   * Registers (or resumes) a task and marks it running; returns a handle to update it. Pass
   * `onCancel` to make the task cancellable — UIs then show a cancel control that invokes
   * {@link ProgressApi.cancel}.
   */
  readonly task: (name: string, options?: { total?: number; label?: string; onCancel?: () => void }) => TaskHandle;
  /** Pre-registers tasks as `pending` (so an orchestrator can show the full list up front). */
  readonly seed: (tasks: readonly { name: string; total?: number; label?: string }[]) => void;
  /** Invokes the task's registered `onCancel` handler (no-op if absent). */
  readonly cancel: (name: string) => void;
  readonly snapshot: () => ProgressSnapshot;
  /** Subscribe to snapshots; returns an unsubscribe. The listener fires on every change. */
  readonly subscribe: (listener: (snapshot: ProgressSnapshot) => void) => () => void;
}

/** Construct a standalone progress registry. */
export const make = (): ProgressApi => {
  const tasks = new Map<string, MutableTask>();
  const cancelHandlers = new Map<string, () => void>();
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
    if (options.onCancel) {
      cancelHandlers.set(name, options.onCancel);
      entry.cancellable = true;
    }
    tasks.set(name, entry);
    emit();
    return {
      advance: (by = 1) => touch(entry, (item) => (item.current += by)),
      set: (current) => touch(entry, (item) => (item.current = current)),
      total: (total) => touch(entry, (item) => (item.total = total)),
      estimate: (remainingMs) => touch(entry, (item) => (item.estimatedMs = remainingMs)),
      note: (text) => touch(entry, (item) => (item.note = text)),
      done: () => touch(entry, (item) => (item.status = 'done')),
      fail: (error) => touch(entry, (item) => ((item.status = 'error'), (item.error = error))),
      remove: () => {
        tasks.delete(name);
        cancelHandlers.delete(name);
        emit();
      },
    };
  };

  const cancel: ProgressApi['cancel'] = (name) => {
    cancelHandlers.get(name)?.();
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

  return { task, seed, cancel, snapshot, subscribe };
};

/**
 * Estimated remaining time (ms): the producer's `estimatedMs` if present, else a naive linear
 * estimate `elapsedMs / current × (total − current)` when the total and some progress are known;
 * `undefined` when it cannot be estimated.
 */
export const deriveEta = (task: TaskProgress): number | undefined => {
  if (task.estimatedMs !== undefined) {
    return task.estimatedMs;
  }
  if (task.total !== undefined && task.current > 0 && task.current < task.total && task.elapsedMs !== undefined) {
    return (task.elapsedMs / task.current) * (task.total - task.current);
  }
};
