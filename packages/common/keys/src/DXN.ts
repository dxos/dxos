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
 * Recursive segment-chain check used by {@link Name}: hyphens are permitted in
 * every segment except the truly final one.
 *
 * TypeScript template literal inference is non-greedy: `${string}.${infer Rest}`
 * always splits at the first dot. The type recurses until `Rest` has no more dots,
 * at which point it is the true final segment and is checked for hyphens.
 */
type ValidSegmentChain<T extends string> = T extends `${string}.${infer Rest}`
  ? Rest extends `${string}.${string}`
    ? [ValidSegmentChain<Rest>] extends [never]
      ? never
      : T
    : Rest extends `${string}-${string}`
      ? never
      : T
  : never;

/**
 * Compile-time validation for NSID strings (the `dxn:` prefix is absent here).
 *
 * Checks two rules expressible with template literal types:
 * - Three-segment minimum (at least two dots) for names that are fully known at
 *   compile time — matches the runtime grammar in {@link DXN_SPEC_REGEXP} and
 *   `parse`.
 * - Final segment (after the last dot) must not contain a hyphen.
 *
 * The three-segment minimum only applies once `Head` (the portion before the
 * first dot) resolves to a concrete literal, so a fully literal two-segment
 * name like `a.b` is rejected. Template-literal call sites whose prefix is a
 * runtime `string` (e.g. `` `${meta.key}.event` ``) can't be proven to have
 * enough segments at compile time — `Head` there infers as `string` itself —
 * so only the known final segment is checked; the rest is validated at
 * runtime by the regex inside `parse`.
 */
export type Name<T extends string> = [string] extends [T]
  ? string
  : T extends `${infer Head}.${infer Rest}`
    ? Rest extends `${string}.${string}`
      ? [ValidSegmentChain<Rest>] extends [never]
        ? never
        : T
      : [string] extends [Head]
        ? Rest extends `${string}-${string}`
          ? never
          : T
        : never
    : never;

/**
 * Effect Schema validating an NSID name — the `dxn:`-less portion — at runtime, mirroring the rules
 * the {@link Name} type checks at compile time (multi-segment; camelCase final segment). Pairs with
 * the {@link Name} type for schema fields that hold a bare NSID (e.g. a model id passed to a creator
 * helper). Named `NameSchema` because a value cannot share the generic `Name` type's name.
 */
export const NameSchema: Schema.Schema<string, string> = Schema.String.pipe(
  Schema.filter((value) => DXN_SPEC_REGEXP.test(`dxn:${value}`), { message: () => 'Invalid NSID name' }),
  Schema.annotations({ title: 'DXN.Name', description: 'NSID name (the dxn: prefix omitted)' }),
);

/**
 * Cheap prefix check — does not validate the full DXN grammar.
 * Sufficient for narrowing a URI to a DXN.
 */
export const isDXN = (value: unknown): value is DXN => typeof value === 'string' && value.startsWith('dxn:');

/**
 * Constructs a DXN from an NSID (and optional version). Throws if the result
 * is not a valid DXN. Use `tryMake` for non-throwing string parsing.
 *
 * Static NSID strings are validated at compile time via {@link Name}:
 * the final segment must be camelCase (no hyphens). Template-literal strings
 * with a runtime prefix are accepted here but still validated at runtime.
 *
 * @example make('org.dxos.type.calendar') → 'dxn:org.dxos.type.calendar'
 * @example make('org.dxos.type.calendar', '1.0.0') → 'dxn:org.dxos.type.calendar:1.0.0'
 */
export const make: {
  <T extends string>(
    nsid: [Name<T>] extends [never] ? `Invalid NSID "${T}": final segment must be camelCase (no hyphens)` : T,
    version?: string,
  ): DXN;
} = (nsid: string, version?: string): DXN => parse(version != null ? `dxn:${nsid}:${version}` : `dxn:${nsid}`);

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
