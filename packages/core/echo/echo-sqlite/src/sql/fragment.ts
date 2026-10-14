//
// Copyright 2026 DXOS.org
//

import { UnsupportedQueryError } from '../errors.ts';

/**
 * A piece of SQL text with its positional parameters, kept together so fragments compose in any
 * order without the parameter list drifting from the placeholders.
 */
export class Fragment {
  constructor(
    readonly sql: string,
    readonly params: readonly unknown[] = [],
  ) {}
}

/**
 * Trusted SQL text spliced verbatim (identifiers, JSON paths built by {@link jsonPath}, keywords).
 */
export const raw = (text: string): Fragment => new Fragment(text);

/**
 * Tagged template: interpolated fragments are spliced, every other value becomes a bound `?`.
 */
export const sql = (strings: TemplateStringsArray, ...values: unknown[]): Fragment => {
  let text = strings[0];
  const params: unknown[] = [];
  values.forEach((value, index) => {
    if (value instanceof Fragment) {
      text += value.sql;
      params.push(...value.params);
    } else {
      text += '?';
      params.push(toParam(value));
    }
    text += strings[index + 1];
  });
  return new Fragment(text, params);
};

/**
 * Joins fragments with a separator.
 */
export const join = (fragments: readonly Fragment[], separator: string): Fragment =>
  new Fragment(
    fragments.map((fragment) => fragment.sql).join(separator),
    fragments.flatMap((fragment) => fragment.params),
  );

/**
 * A JSON path literal (`'$."a"."b"'`) for `json_extract`; keys are quoted so any property name is a
 * single label, and the literal is SQL-escaped.
 */
export const jsonPath = (keys: readonly string[]): Fragment => {
  for (const key of keys) {
    // SQLite's JSON path labels have no escape syntax, so such a key cannot be addressed at all.
    if (key.includes('"') || key.includes('\\')) {
      throw new UnsupportedQueryError(`property name ${JSON.stringify(key)}`);
    }
  }
  const path = '$' + keys.map((key) => `."${key}"`).join('');
  return raw(`'${path.replaceAll("'", "''")}'`);
};

/** SQLite has no boolean type; bind as 0/1 like its JSON functions report them. */
const toParam = (value: unknown): unknown => (typeof value === 'boolean' ? (value ? 1 : 0) : value);
