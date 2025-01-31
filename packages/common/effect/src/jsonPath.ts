//
// Copyright 2025 DXOS.org
//

// TODO(ZaymonFC): Talk with Rich/Josiah about where this module should live.

import { Schema as S } from '@effect/schema';
import { isSome } from 'effect/Option';

import { invariant } from '@dxos/invariant';

export type JsonProp = string & { __JsonPath: true; __JsonProp: true };
export type JsonPath = string & { __JsonPath: true };

const PATH_REGEX = /^($|[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*|\[\d+\](?:\.)?)*$)/;
const PROP_REGEX = /\w+/;

/**
 * https://www.ietf.org/archive/id/draft-goessner-dispatch-jsonpath-00.html
 */
export const JsonPath = S.String.pipe(S.pattern(PATH_REGEX)) as any as S.Schema<JsonPath>;
export const JsonProp = S.NonEmptyString.pipe(S.pattern(PROP_REGEX)) as any as S.Schema<JsonProp>;

export const isJsonPath = (value: unknown): value is JsonPath => {
  return isSome(S.validateOption(JsonPath)(value));
};

/**
 * Creates a JsonPath from an array of path segments.
 *
 * Currently supports:
 * - Simple property access (e.g., 'foo.bar')
 * - Array indexing with non-negative integers (e.g., 'foo[0]')
 * - Identifiers starting with letters, underscore, or $ (e.g., '$foo', '_bar')
 * - Dot notation for nested properties (e.g., 'foo.bar.baz')
 *
 * Does not support (yet?).
 * - Recursive descent (..)
 * - Wildcards (*)
 * - Array slicing
 * - Filters
 * - Negative indices
 *
 * @param path Array of string or number segments
 * @returns Valid JsonPath or undefined if invalid
 */
export const createJsonPath = (path: (string | number)[]): JsonPath => {
  const candidatePath = path
    .map((p, i) => {
      if (typeof p === 'number') {
        return `[${p}]`;
      } else {
        return i === 0 ? p : `.${p}`;
      }
    })
    .join('');

  invariant(isJsonPath(candidatePath), `Invalid JsonPath: ${candidatePath}`);
  return candidatePath;
};

/**
 * Splits a JsonPath into its constituent parts.
 * Handles property access and array indexing.
 */
export const splitJsonPath = (path: JsonPath): string[] => {
  if (!isJsonPath(path)) {
    return [];
  }

  return (
    path
      .match(/[a-zA-Z_$][\w$]*|\[\d+\]/g)
      ?.map((part) => (part.startsWith('[') ? part.replace(/[[\]]/g, '') : part)) ?? []
  );
};
