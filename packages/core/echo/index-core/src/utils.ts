//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';

export type ObjectPropPath = (string | number)[];

/**
 * Escaped property path within an object.
 *
 * Escaping rules:
 *
 * - '.' -> '\.'
 * - '\' -> '\\'
 * - contact with .
 */
export const EscapedPropPath: Schema.SchemaClass<string, string> & {
  escape: (path: ObjectPropPath) => EscapedPropPath;
  unescape: (path: EscapedPropPath) => ObjectPropPath;
} = class extends Schema.String.annotations({ title: 'EscapedPropPath' }) {
  static escape(path: ObjectPropPath): EscapedPropPath {
    return path.map((p) => p.toString().replaceAll('\\', '\\\\').replaceAll('.', '\\.')).join('.');
  }

  static unescape(path: EscapedPropPath): ObjectPropPath {
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
