//
// Copyright 2026 DXOS.org
//

// Reference: https://atproto.com/specs/nsid

// Authority label: starts with alpha, allows hyphens in body, max 63 chars.
const authorityLabel = /[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/;

// Middle authority label: like authorityLabel but may start with a digit.
const middleLabel = /[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/;

// Name segment: starts with alpha, alphanumeric only (no hyphens), max 63 chars.
const nameLabel = /[a-zA-Z]([a-zA-Z0-9]{0,62})?/;

// Full NSID: <authorityLabel> ( '.' <middleLabel> )+ '.' <nameLabel>
const ID = new RegExp(`^${authorityLabel.source}(\\.${middleLabel.source})+(\\.${nameLabel.source})$`);

const PART = new RegExp(`^${nameLabel.source}$`);

/**
 * Branded string type for well-formed ids.
 */
export type Id = string & { readonly __id: unique symbol };

/**
 * Tagged template literal that constructs a well-formed, dot-delimited id string.
 * Throws if the resulting string is not well-formed.
 *
 * Follows the AT Protocol NSID convention (https://atproto.com/specs/nsid)
 * Full NSID: authority segments (hyphens allowed) + dot + name segment (no hyphens).
 * - Authority segments: at most 253 characters (including periods), and must contain at least two segments.
 * - Name segment: starts with alpha, alphanumeric only (no hyphens), max 63 chars.
 *
 * @example
 *   id`org.dxos.plugin.deck` // 'org.dxos.plugin.deck'
 *   id`${ns}.${plugin}.deck` // joins interpolated values
 */
export function id(strings: TemplateStringsArray, ...values: unknown[]): Id {
  const raw = strings.reduce((out, str, i) => out + str + (i < values.length ? String(values[i]) : ''), '');
  if (!ID.test(raw)) {
    throw new Error(`Invalid id (expected AT Protocol NSID): ${JSON.stringify(raw)}`);
  }

  return raw as Id;
}

/**
 * Returns true if the given string is a well-formed NSID.
 */
export const isWellFormedId = (value: string): boolean => ID.test(value);

/**
 * Returns true if the given string is a well-formed NSID name segment:
 * `/^[a-zA-Z][a-zA-Z0-9]{0,62}$/` (starts with alpha, alphanumeric only, no dots or hyphens).
 */
export const isWellFormedIdPart = (value: string): boolean => PART.test(value);
