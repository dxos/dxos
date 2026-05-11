//
// Copyright 2026 DXOS.org
//

const PART = /^[a-z][a-zA-Z0-9]*$/;
const ID = /^[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*)*$/;

/**
 * Tagged template literal that constructs a well-formed, dot-delimited id string.
 * Each part must start with a lowercase letter followed by alphanumeric characters.
 * Throws if the resulting string is not well-formed.
 *
 * @example
 *   id`org.dxos.plugin.deck` // 'org.dxos.plugin.deck'
 *   id`${namespace}.${name}` // joins interpolated values
 */
export function id(strings: TemplateStringsArray, ...values: unknown[]): string {
  const raw = strings.reduce((out, str, i) => out + str + (i < values.length ? String(values[i]) : ''), '');
  if (!ID.test(raw)) {
    throw new Error(`Invalid id: ${JSON.stringify(raw)}`);
  }
  return raw;
}

/**
 * Returns true if the given string is a well-formed id (dot-delimited parts,
 * each starting with a lowercase letter followed by alphanumeric characters).
 */
export const isWellFormedId = (value: string): boolean => ID.test(value);

/**
 * Returns true if the given string is a well-formed id part (starts with a
 * lowercase letter followed by alphanumeric characters; no dots).
 */
export const isWellFormedIdPart = (value: string): boolean => PART.test(value);
