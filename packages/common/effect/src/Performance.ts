//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Exit from 'effect/Exit';

/**
 * Whether track entries reach the performance timeline: on under the dev server, off in a production
 * build unless it was made with `VITE_PERF_TRACK_ENTRIES=true`. The bundler folds the constant, so a
 * gated call site costs nothing in a build that has it off.
 *
 * Entries are not free. `performance.measure` structured-clones `detail` on every call and keeps every
 * entry for the life of the realm, so a per-query entry carrying bound parameters was the largest
 * allocating mechanism in a Composer tab once the log store's sweep was fixed.
 */
export const TRACK_ENTRIES_ENABLED: boolean =
  Boolean(import.meta.env?.DEV) || import.meta.env?.VITE_PERF_TRACK_ENTRIES === 'true';

/** Longer strings are cut in the entry, since the clone would otherwise copy them whole. */
const MAX_STRING_LENGTH = 256;
const MAX_ARRAY_LENGTH = 64;
const MAX_DEPTH = 3;

const summarize = (value: unknown, depth: number): unknown => {
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…(${value.length} chars)` : value;
  }
  if (value instanceof Uint8Array) {
    return `<Uint8Array ${value.length} bytes>`;
  }
  if (value instanceof ArrayBuffer) {
    return `<ArrayBuffer ${value.byteLength} bytes>`;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_LENGTH) {
      return `<Array ${value.length} items>`;
    }
    return depth >= MAX_DEPTH ? `<Array ${value.length} items>` : value.map((item) => summarize(item, depth + 1));
  }
  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    if (depth >= MAX_DEPTH) {
      return `<Object ${Object.keys(value).length} keys>`;
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, summarize(item, depth + 1)]));
  }
  return value;
};

/**
 * Bounds a value before it goes into an entry's `detail`: a blob or long string becomes a type-and-size
 * marker, a large array a count, and nesting stops at a fixed depth. Anything with a prototype other than
 * `Object` (class instances, ECHO objects) passes through untouched, as the clone would fail on it anyway.
 */
export const summarizeDetail = (value: unknown): unknown => summarize(value, 0);

export interface DevtoolsOptions {
  /**
   * @example 'track-entry'
   */
  dataType: string;
  track: string;
  trackGroup: string;
  /**
   * @example 'tertiary-dark'
   */
  color: string;
  properties?: [string, any][];
  tooltipText?: string;
}

export interface TrackEntryOptions {
  name: string;
  start: number;
  /** Defaults to now. */
  end?: number;
  devtools?: DevtoolsOptions;
  detail?: Record<string, unknown>;
}

export interface AddTrackEntryOptions {
  name: string;
  devtools?: DevtoolsOptions;
  detail?: Record<string, unknown>;
}

/**
 * Puts one entry on the performance timeline, with `detail` and `devtools.properties` bounded by
 * {@link summarizeDetail}. A no-op unless {@link TRACK_ENTRIES_ENABLED}.
 */
export const trackEntry = (options: TrackEntryOptions): void => {
  if (!TRACK_ENTRIES_ENABLED) {
    return;
  }
  performance.measure(options.name, {
    start: options.start,
    end: options.end ?? performance.now(),
    detail: {
      ...(options.detail && (summarizeDetail(options.detail) as Record<string, unknown>)),
      devtools: options.devtools && {
        ...options.devtools,
        properties: options.devtools.properties?.map(([key, value]) => [key, summarizeDetail(value)]),
      },
    },
  });
};

/**
 * Puts the effect span on the performance timeline in DevTools. See {@link trackEntry}.
 */
export const addTrackEntry =
  <A, E>(options: AddTrackEntryOptions | ((exit: Exit.Exit<A, E>) => AddTrackEntryOptions)) =>
  <R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => {
    if (!TRACK_ENTRIES_ENABLED) {
      return effect;
    }
    return Effect.gen(function* () {
      const start = performance.now();
      const exit = yield* Effect.exit(effect);
      trackEntry({ start, ...(typeof options === 'function' ? options(exit) : options) });
      return yield* exit;
    });
  };
