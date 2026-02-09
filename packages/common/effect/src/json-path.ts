//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { JSONPath } from 'jsonpath-plus';

import { invariant } from '@dxos/invariant';
import { getDeep, setDeep } from '@dxos/util';

export type JsonProp = string & { __JsonPath: true; __JsonProp: true };
export type JsonPath = string & { __JsonPath: true };

// TODO(burdon): Start with "$."?

const PATH_REGEX = /^($|[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*|\[\d+\](?:\.)?)*$)/;

const PROP_REGEX = /^\w+$/;

/**
 * https://www.ietf.org/archive/id/draft-goessner-dispatch-jsonpath-00.html
 */
// TODO(burdon): Keys could be arbitrary strings.
export const JsonPath = Schema.String.pipe(Schema.pattern(PATH_REGEX)).annotations({
  title: 'JSON path',
  description: 'JSON path to a property',
}) as any as Schema.Schema<JsonPath>;
export const JsonProp = Schema.NonEmptyString.pipe(
  Schema.pattern(PROP_REGEX, {
    message: () => 'Property name must contain only letters, numbers, and underscores',
  }),
) as any as Schema.Schema<JsonProp>;

export const isJsonPath = (value: unknown): value is JsonPath => {
  return Option.isSome(Schema.validateOption(JsonPath)(value));
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
export const createJsonPath = (path: readonly (string | number)[]): JsonPath => {
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
 * Converts Effect validation path format (e.g. "addresses.[0].zip")
 * to JsonPath format (e.g., "addresses[0].zip")
 */
export const fromEffectValidationPath = (effectPath: string): JsonPath => {
  // Handle array notation: convert "prop.[0]" to "prop[0]"
  const jsonPath = effectPath.replace(/\.\[(\d+)\]/g, '[$1]');
  invariant(isJsonPath(jsonPath), `Invalid JsonPath: ${jsonPath}`);
  return jsonPath;
};

/**
 * Splits a JsonPath into its constituent parts.
 * Handles property access and array indexing.
 */
export const splitJsonPath = (path: JsonPath): (string | number)[] => {
  if (!isJsonPath(path)) {
    return [];
  }

  return (
    path
      .match(/[a-zA-Z_$][\w$]*|\[\d+\]/g)
      ?.map((part) => part.replace(/[[\]]/g, ''))
      .map((part) => {
        const parsed = Number.parseInt(part, 10);
        return Number.isNaN(parsed) ? part : parsed;
      }) ?? []
  );
};

/**
 * Applies a JsonPath to an object.
 */
// TODO(burdon): Reconcile with getValue.
export const getField = (object: any, path: JsonPath): any => {
  // By default, JSONPath returns an array of results.
  return JSONPath({ path, json: object })[0];
};

/**
 * Get value from object using JsonPath.
 */
export const getValue = <T extends object>(obj: T, path: JsonPath): any => {
  return getDeep(obj, splitJsonPath(path));
};

/**
 * Set value on object using JsonPath.
 */
export const setValue = <T extends object>(obj: T, path: JsonPath, value: any): T => {
  return setDeep(obj, splitJsonPath(path), value);
};
