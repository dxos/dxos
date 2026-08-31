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

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

// prettier-ignore
/** Every character the final group of {@link DXN_SPEC_REGEXP} excludes and a caller might plausibly type. */
type Invalid =
  | '-' | '_' | '/' | '\\' | ' ' | '\t' | '\n' | ':' | ';' | ',' | '.' | '#' | '?' | '@' | '!'
  | '$' | '%' | '&' | '*' | '+' | '=' | '~' | '^' | '`' | "'" | '"' | '(' | ')' | '[' | ']'
  | '{' | '}' | '<' | '>' | '|';

/**
 * Compile-time validation of a single NSID segment in final position: alphanumeric with a leading
 * letter, per the final group of {@link DXN_SPEC_REGEXP}. Resolves to `T` when valid and `never`
 * otherwise.
 *
 * Matches on excluded characters rather than walking the string character by character, so an
 * interpolated segment (`` `item${number}` ``) is accepted rather than rejected for a placeholder
 * the type cannot evaluate — a walk cannot tell a placeholder from a bad character. A widened
 * `string` passes through for the same reason, leaving both to the runtime check.
 */
export type Segment<T extends string> = [string] extends [T]
  ? T
  : T extends ''
    ? never
    : T extends `${string}${Invalid}${string}`
      ? never
      : T extends `${Digit}${string}`
        ? never
        : T;

/**
 * The substring after the last `.`, or the whole string when there is none.
 *
 * TypeScript template literal inference is non-greedy: `${string}.${infer Rest}` always splits at
 * the first dot, so the type recurses until `Rest` has no more dots.
 */
type LastSegment<T extends string> = T extends `${string}.${infer Rest}` ? LastSegment<Rest> : T;

/**
 * Compile-time validation of a dotted name whose final segment must be a valid {@link Segment}.
 * Every preceding segment is unconstrained, so a prefix carrying a hyphenated typename
 * (`org.dxos.type.task-set.article`) is fine.
 *
 * This is the shape of a plugin-local id — a surface or graph-extension id, appended to a plugin's
 * NSID to form a full DXN path. Unlike {@link Name} it has no segment-count minimum, since a local
 * id is a suffix rather than a whole NSID.
 */
export type Path<T extends string> = [string] extends [T] ? T : [Segment<LastSegment<T>>] extends [never] ? never : T;

/**
 * Whether a dotted name's final segment is a valid {@link Segment}. The runtime counterpart of
 * {@link Path}, and stricter: it requires every character of the final segment to be alphanumeric.
 *
 * @example Valid:   'about', 'integrationArticle', 'article.journal', 'org.dxos.type.task-set.article'.
 * @example Invalid: 'integration-article', 'plugin-spec', 'article.task-set'.
 */
export const isValidPath = (name: string): boolean => /^[a-zA-Z][a-zA-Z0-9]*$/.test(name.split('.').pop() ?? '');

/**
 * Recursive segment-chain check used by {@link Name}: hyphens are permitted in
 * every segment except the truly final one, which must be a valid {@link Segment}.
 */
type ValidSegmentChain<T extends string> = T extends `${string}.${infer Rest}`
  ? Rest extends `${string}.${string}`
    ? [ValidSegmentChain<Rest>] extends [never]
      ? never
      : T
    : [Segment<Rest>] extends [never]
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
 * - Final segment (after the last dot) is a valid {@link Segment}.
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
        ? [Segment<Rest>] extends [never]
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
export const NameSchema: Schema.Codec<string, string> = Schema.String.pipe(
  Schema.refine((value): value is string => DXN_SPEC_REGEXP.test(`dxn:${value}`), { message: 'Invalid NSID name' }),
  Schema.annotate({ title: 'DXN.Name', description: 'NSID name (the dxn: prefix omitted)' }),
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
// Identity-encoded (`Schema<DXN, DXN>`) so consumers can refine without the encode/decode types
// diverging; `refine` leaves `Encoded = string`, and the runtime form is the same branded string.
const Schema_: Schema.Codec<DXN, DXN> = Schema.String.pipe(
  Schema.refine((value): value is DXN => isDXN(value), { message: 'Invalid DXN' }),
  Schema.annotate({
    title: 'DXN',
    description: 'DXN URI: dxn:<nsid>[:<version>]',
  }),
) as unknown as Schema.Codec<DXN, DXN>;
export { Schema_ as Schema };
