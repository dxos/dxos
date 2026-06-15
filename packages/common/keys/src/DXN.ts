//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import type * as URI from './URI';

/**
 * Full DXN regex per spec: `dxn:<nsid>[:<version>]`.
 * Middle segments may contain hyphens; the final segment must be camelCase
 * (alphanumeric, leading letter — no hyphens or underscores).
 */
const DXN_SPEC_REGEXP =
  /^dxn:[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(\.[a-zA-Z][a-zA-Z0-9]{0,62})(:\d+\.\d+\.\d+)?$/;

/**
 * DXN names a resource (type, plugin, capability, etc.).
 *
 * Format: `dxn:<nsid>[:<version>]` where NSID is an atproto-style dotted name.
 *
 * @example
 * ```
 * dxn:org.dxos.type.calendar
 * dxn:org.dxos.type.calendar:1.0.0
 * dxn:org.dxos.plugin.markdown
 * ```
 */
export type DXN = URI.URI & { readonly __DXN: unique symbol };

/**
 * Cheap prefix check — does not validate the full DXN grammar.
 * Sufficient for narrowing a URI to a DXN.
 */
export const isDXN = (value: unknown): value is DXN => typeof value === 'string' && value.startsWith('dxn:');

/**
 * Constructs a DXN from an NSID (and optional version). Throws if the result
 * is not a valid DXN. Use `tryMake` for non-throwing string parsing.
 *
 * @example make('org.dxos.type.calendar') → 'dxn:org.dxos.type.calendar'
 * @example make('org.dxos.type.calendar', '1.0.0') → 'dxn:org.dxos.type.calendar:1.0.0'
 */
export const make = (nsid: string, version?: string): DXN =>
  parse(version != null ? `dxn:${nsid}:${version}` : `dxn:${nsid}`);

/**
 * Parses a full DXN string. Returns undefined on failure.
 */
export const tryMake = (dxn: string): DXN | undefined => {
  try {
    return parse(dxn);
  } catch {
    return undefined;
  }
};

// Internal — full-grammar validator. Callers outside this module should use
// `make(nsid, version?)` or `tryMake(dxn)`.
const parse = (dxn: string): DXN => {
  if (typeof dxn === 'string' && DXN_SPEC_REGEXP.test(dxn)) {
    return dxn as DXN;
  }
  throw new Error(`Invalid DXN: ${dxn}`);
};

/**
 * Returns the NSID portion of a DXN (the part after `dxn:` and before optional `:<version>`).
 * @example getName('dxn:org.dxos.type.calendar:1.0.0') → 'org.dxos.type.calendar'
 */
export const getName = (dxn: DXN): string => {
  const match = /^dxn:([^:]+)/.exec(dxn);
  if (!match) {
    throw new Error(`Invalid DXN: ${dxn}`);
  }
  return match[1];
};

/**
 * Returns the semver version from a versioned DXN, or undefined if unversioned.
 * @example getVersion('dxn:org.dxos.type.calendar:1.0.0') → '1.0.0'
 */
export const getVersion = (dxn: DXN): string | undefined => {
  const match = /^dxn:[^:]+:(\d+\.\d+\.\d+)$/.exec(dxn);
  return match?.[1];
};

/**
 * Effect Schema for DXN validation.
 */
// Identity-encoded schema (`Schema<DXN, DXN>`) so consumers can refine generic schemas
// without the encode/decode types diverging. `Schema.filter` produces a refinement with
// `Encoded = string`; we narrow the encoded form too with `as unknown as` since the runtime
// representation is identical (a branded string).
const Schema_: Schema.Schema<DXN, DXN> = Schema.String.pipe(
  Schema.filter((value): value is DXN => isDXN(value), { message: () => 'Invalid DXN' }),
  Schema.annotations({
    title: 'DXN',
    description: 'DXN URI: dxn:<nsid>[:<version>]',
  }),
) as unknown as Schema.Schema<DXN, DXN>;
export { Schema_ as Schema };
