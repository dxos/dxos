//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';

export type EntityPropPath = string[];

/**
 * SQLite bound-variable limit (`SQLITE_LIMIT_VARIABLE_NUMBER`, typically 999 in wasm builds).
 * Batch `IN (...)` queries below this; 500 gives a safe margin.
 */
export const SQL_CHUNK_SIZE = 500;

/** Split an array into chunks of at most `size` for batched SQL `IN (...)` clauses. */
export const chunkArray = <T>(items: readonly T[], size: number = SQL_CHUNK_SIZE): T[][] => {
  // A non-positive or fractional size would fail to advance the loop and spin forever.
  invariant(Number.isInteger(size) && size > 0, 'chunk size must be a positive integer');
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

/**
 * Escaped property path within an object.
 *
 * Escaping rules:
 *
 * - '.' -> '\.'
 * - '\' -> '\\'
 * - contact with .
 */
export const EscapedPropPath: Schema.Codec<string, string> & {
  escape: (path: EntityPropPath) => EscapedPropPath;
  unescape: (path: EscapedPropPath) => EntityPropPath;
} = class extends Schema.String.annotate({ title: 'EscapedPropPath' }) {
  static escape(path: EntityPropPath): EscapedPropPath {
    return path.map((p) => p.toString().replaceAll('\\', '\\\\').replaceAll('.', '\\.')).join('.');
  }

  static unescape(path: EscapedPropPath): EntityPropPath {
    const parts: string[] = [];
    let current = '';

    for (let i = 0; i < path.length; i++) {
      if (path[i] === '\\') {
        invariant(i + 1 < path.length && (path[i + 1] === '.' || path[i + 1] === '\\'), 'Malformed escaping.');
        current = current + path[i + 1];
        i++;
      } else if (path[i] === '.') {
        parts.push(current);
        current = '';
      } else {
        current += path[i];
      }
    }
    parts.push(current);

    return parts;
  }
};
export type EscapedPropPath = Schema.Schema.Type<typeof EscapedPropPath>;
