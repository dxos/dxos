//
// Copyright 2026 DXOS.org
//

const PART = /^[a-z][a-zA-Z0-9]*$/;
const ID = /^[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*){2,}$/;

/**
 * Branded string type for well-formed ids.
 */
export type Id = string & { readonly __id: unique symbol };

/**
 * Tagged template literal that constructs a well-formed, dot-delimited id string.
 * Throws if the resulting string is not well-formed.
 *
 * Follows the AT Protocol NSID convention (https://atproto.com/specs/nsid).
 * Reference regex: `/^[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(\.[a-zA-Z]([a-zA-Z0-9]{0,62})?)$/`
 * This implementation is stricter: all parts must be fully lowercase and contain no hyphens.
 *
 * @example
 *   id`org.dxos.plugin.deck` // 'org.dxos.plugin.deck'
 *   id`${ns}.${plugin}.deck` // joins interpolated values
 */
export function id(strings: TemplateStringsArray, ...values: unknown[]): Id {
  const raw = strings.reduce((out, str, i) => out + str + (i < values.length ? String(values[i]) : ''), '');
  if (!ID.test(raw)) {
    throw new Error(`Invalid id (must have at least three dot-delimited lowercase parts): ${JSON.stringify(raw)}`);
  }

  return raw as Id;
}

/**
 * Returns true if the given string matches `/^[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*){2,}$/`.
 */
export const isWellFormedId = (value: string): boolean => ID.test(value);

/**
 * Returns true if the given string matches `/^[a-z][a-zA-Z0-9]*$/` (a single id part, no dots).
 */
export const isWellFormedIdPart = (value: string): boolean => PART.test(value);
