//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import { type MemoryQuery, type MemoryService } from '@dxos/echo-memory';

/** One SPARQL query run against a space's memory, by an agent's tool call or by the memory view. */
export type Entry = {
  readonly id: number;
  readonly sparql: string;
  readonly startedAt: number;
  /** Absent while the query runs. */
  readonly result?: Result;
};

/** How a logged query ended: its solution count and the first {@link PREVIEW_ROWS} of them, or its error. */
export type Result =
  | { readonly count: number; readonly preview: readonly MemoryQuery.SparqlRow[] }
  | { readonly error: string };

/** How many solutions of each logged query are kept for a view to show. */
export const PREVIEW_ROWS = 50;

/** How many queries a memory's log keeps. */
export const SIZE = 100;

/** A memory's log before its first query; one instance, since a view compares log snapshots by identity. */
const EMPTY: readonly Entry[] = [];

type Log = { entries: readonly Entry[]; readonly listeners: Set<() => void> };

/**
 * Logs by memory: an operation sees only the space's `MemoryService`, which the client hands out once per space, so
 * the memory itself is the key that joins an agent's queries to the view of that space.
 */
const logs = new WeakMap<MemoryService.Service, Log>();
let nextId = 0;

const logOf = (memory: MemoryService.Service): Log => {
  let log = logs.get(memory);
  if (!log) {
    log = { entries: EMPTY, listeners: new Set() };
    logs.set(memory, log);
  }
  return log;
};

// Replaces the entry rather than mutating it, so a view holding the previous log array sees a new one.
const record = (memory: MemoryService.Service, entry: Entry): void => {
  const log = logOf(memory);
  log.entries = [...log.entries.filter((existing) => existing.id !== entry.id), entry]
    .sort((left, right) => left.id - right.id)
    .slice(-SIZE);
  log.listeners.forEach((listener) => listener());
};

/** Records `run`, a raw SPARQL read of `memory`, as it starts and as it ends, so a view can follow an agent live. */
export const track = <A extends readonly unknown[], E, R>(
  memory: MemoryService.Service,
  sparql: string,
  run: Effect.Effect<A, E, R>,
  preview: (result: A) => readonly MemoryQuery.SparqlRow[],
): Effect.Effect<A, E, R> =>
  Effect.suspend(() => {
    const entry: Entry = { id: nextId++, sparql, startedAt: Date.now() };
    record(memory, entry);
    return run.pipe(
      Effect.tap((result) =>
        Effect.sync(() =>
          record(memory, {
            ...entry,
            result: { count: result.length, preview: preview(result).slice(0, PREVIEW_ROWS) },
          }),
        ),
      ),
      Effect.tapError((error) => Effect.sync(() => record(memory, { ...entry, result: { error: String(error) } }))),
    );
  });

/** The queries run against the memory so far, oldest first (the last {@link SIZE}). */
export const entries = (memory: MemoryService.Service): readonly Entry[] => logs.get(memory)?.entries ?? EMPTY;

/** Calls `listener` as each query of the memory starts and again as it ends; returns an unsubscribe. */
export const subscribe = (memory: MemoryService.Service, listener: () => void): (() => void) => {
  const { listeners } = logOf(memory);
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
