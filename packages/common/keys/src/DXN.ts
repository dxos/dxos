//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import type * as URI from './URI';

/**
 * Full DXN regex per spec — new format only: `dxn:<nsid>[:<version>]`.
 * Does NOT match legacy `dxn:<kind>:<...>` formats (e.g. `dxn:type:...`).
 */
const DXN_SPEC_REGEXP =
  /^dxn:[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(\.[a-zA-Z]([a-zA-Z0-9-]{0,62})?)(:\d+\.\d+\.\d+)?$/;

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
export type DXN = string & { readonly __DXN: unique symbol } & URI.URI;

/**
 * Returns true if the value is a valid DXN in the new `dxn:<nsid>[:<version>]` format.
 * Does not accept the legacy `dxn:<kind>:<...>` format.
 */
export const isDXN = (s: unknown): s is DXN => typeof s === 'string' && DXN_SPEC_REGEXP.test(s);

/**
 * Creates an unversioned DXN from an NSID.
 * @example fromTypename('org.dxos.type.calendar') → 'dxn:org.dxos.type.calendar'
 */
export const fromTypename = (nsid: string): DXN => `dxn:${nsid}` as DXN;

/**
 * Creates a versioned DXN.
 * @example fromTypenameAndVersion('org.dxos.type.calendar', '1.0.0') → 'dxn:org.dxos.type.calendar:1.0.0'
 */
export const fromTypenameAndVersion = (nsid: string, version: string): DXN => `dxn:${nsid}:${version}` as DXN;

/**
 * Parses a DXN string, normalizing legacy `dxn:type:<nsid>` format to the canonical
 * `dxn:<nsid>` form.
 */
export const parse = (s: string): DXN => {
  // Backward compat: strip legacy `type:` kind segment.
  const legacyTypeMatch = /^dxn:type:(.+)$/.exec(s);
  if (legacyTypeMatch) {
    const normalized = `dxn:${legacyTypeMatch[1]}` as DXN;
    if (DXN_SPEC_REGEXP.test(normalized)) {
      return normalized;
    }
  }
  if (isDXN(s)) {
    return s;
  }
  throw new Error(`Invalid DXN: ${s}`);
};

/**
 * Like `parse` but returns undefined on failure instead of throwing.
 */
export const tryParse = (s: string): DXN | undefined => {
  try {
    return parse(s);
  } catch {
    return undefined;
  }
};

/**
 * Returns the NSID portion of a DXN (the part after `dxn:` and before optional `:<version>`).
 * @example getNsid('dxn:org.dxos.type.calendar:1.0.0') → 'org.dxos.type.calendar'
 */
export const getNsid = (dxn: DXN): string => {
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
 * Strict equality of two DXNs.
 */
export const equals = (a: DXN, b: DXN): boolean => a === b;

/**
 * Effect Schema for DXN validation.
 */
const Schema_: Schema.Schema<DXN, string> = Schema.String.pipe(
  Schema.filter(isDXN, { message: () => 'Invalid DXN' }),
  Schema.annotations({
    title: 'DXN',
    description: 'DXN URI: dxn:<nsid>[:<version>]',
  }),
) as Schema.Schema<DXN, string>;
export { Schema_ as Schema };
