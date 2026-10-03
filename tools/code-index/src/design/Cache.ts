//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * A content-addressed answer cache for decision calls, so rerunning a design prompt re-bills
 * nothing it already asked. One JSON line per answer, appended as it arrives: a run killed halfway
 * keeps everything it paid for, and a reader that finds a torn last line just skips it.
 */

export class CacheError extends Data.TaggedError('code-index/design/CacheError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export interface Api {
  readonly get: (key: string) => unknown;
  readonly set: (key: string, value: unknown) => Effect.Effect<void, CacheError>;
  readonly size: () => number;
}

/** The key for one call: everything that can change its answer, hashed. */
export const keyOf = (parts: unknown): string => createHash('sha256').update(JSON.stringify(parts)).digest('hex');

/** An in-memory cache, for tests and for runs told not to persist. */
export const memory = (): Api => {
  const entries = new Map<string, unknown>();
  return {
    get: (key) => entries.get(key),
    set: (key, value) => Effect.sync(() => void entries.set(key, value)),
    size: () => entries.size,
  };
};

/** A cache persisted at `path` (created on first write). */
export const open = (path: string): Effect.Effect<Api, CacheError> =>
  Effect.try({
    try: () => {
      const entries = new Map<string, unknown>();
      if (existsSync(path)) {
        for (const line of readFileSync(path, 'utf8').split('\n')) {
          if (line.length === 0) {
            continue;
          }
          try {
            const { key, value } = JSON.parse(line) as { key: string; value: unknown };
            entries.set(key, value);
          } catch {
            // A torn final line from an interrupted run; the answer is simply asked again.
          }
        }
      }
      const api: Api = {
        get: (key) => entries.get(key),
        set: (key, value) =>
          Effect.try({
            try: () => {
              entries.set(key, value);
              mkdirSync(dirname(path), { recursive: true });
              appendFileSync(path, `${JSON.stringify({ key, value })}\n`);
            },
            catch: (cause) => new CacheError({ message: `Cannot write cache ${path}`, cause }),
          }),
        size: () => entries.size,
      };
      return api;
    },
    catch: (cause) => new CacheError({ message: `Cannot read cache ${path}`, cause }),
  });
