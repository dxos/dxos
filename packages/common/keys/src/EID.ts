//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import type { EntityId } from './entity-id';
import type { SpaceId } from './space-id';
import type * as URI from './URI';

// Canonical-form regex covering all three EID shapes.
//   echo://<spaceId>/<objectId>
//   echo://<spaceId>
//   echo:/<objectId>      (local)
//   echo:///<objectId>    (local, alt form)
const ECHO_URI_REGEXP = /^echo:(?:\/\/[^/]+(?:\/[^/]+)?|(?:\/\/\/|\/)[^/]+)$/;

// Sub-patterns used for extraction.
const QUALIFIED_RE = /^echo:\/\/([^/]+)\/([^/]+)$/;
const SPACE_ONLY_RE = /^echo:\/\/([^/]+)$/;
const LOCAL_RE = /^echo:(?:\/\/\/|\/)([^/]+)$/;

/**
 * Addresses an ECHO object or space. Uses the `echo:` URI scheme.
 *
 * @example
 * ```
 * echo://BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE/01J00J9B45YHYSGZQTQMSKMGJ6
 * echo:/01J00J9B45YHYSGZQTQMSKMGJ6
 * echo://BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE
 * ```
 */
export type EID = URI.URI & { readonly __EID: unique symbol };

/**
 * Returns true if the value is a valid EID.
 */
export const isEID = (value: unknown): value is EID => typeof value === 'string' && value.startsWith('echo:');

/**
 * Parses a string to EID. Throws if the string is not a valid canonical `echo:` EID.
 */
export const parse = (uri: string): EID => {
  if (!ECHO_URI_REGEXP.test(uri)) {
    throw new Error(`Invalid EID: ${uri}`);
  }
  return uri as EID;
};

/**
 * Like `parse` but returns undefined on failure instead of throwing.
 */
export const tryParse = (uri: string): EID | undefined => {
  try {
    return parse(uri);
  } catch {
    return undefined;
  }
};

/**
 * Constructs an EID. Validates the result via `parse`.
 *
 * - `{ spaceId, entityId }` → `echo://<spaceId>/<entityId>` (fully qualified)
 * - `{ entityId }`          → `echo:/<entityId>` (local — current space)
 * - `{ spaceId }`           → `echo://<spaceId>` (space-only)
 *
 * Throws if neither id is provided, or if the result is not a valid EID.
 */
export const make = ({ spaceId, entityId }: { spaceId?: SpaceId; entityId?: EntityId }): EID => {
  let raw: string;
  if (spaceId != null && entityId != null) {
    raw = `echo://${spaceId}/${entityId}`;
  } else if (entityId != null) {
    raw = `echo:/${entityId}`;
  } else if (spaceId != null) {
    raw = `echo://${spaceId}`;
  } else {
    throw new Error('EID.make requires at least one of spaceId or entityId');
  }
  return parse(raw);
};

/**
 * Returns the SpaceId from a fully-qualified EID, or undefined for local refs.
 */
export const getSpaceId = (uri: EID): SpaceId | undefined => {
  const normalized = parse(uri);
  const match = QUALIFIED_RE.exec(normalized) ?? SPACE_ONLY_RE.exec(normalized);
  return match?.[1] as SpaceId | undefined;
};

/**
 * Returns the EntityId from an EID, or undefined for space-only refs.
 */
export const getEntityId = (uri: EID): EntityId | undefined => {
  const normalized = parse(uri);
  const qualMatch = QUALIFIED_RE.exec(normalized);
  if (qualMatch) {
    return qualMatch[2] as EntityId;
  }
  const localMatch = LOCAL_RE.exec(normalized);
  return localMatch?.[1] as EntityId | undefined;
};

/**
 * Returns true if the EID is a local reference (no authority/space).
 */
export const isLocal = (uri: EID): boolean => {
  const normalized = parse(uri);
  return LOCAL_RE.test(normalized);
};

/**
 * Returns true if the two EIDs refer to the same object, normalizing both first.
 */
export const equals = (a: EID, b: EID): boolean => parse(a) === parse(b);

/**
 * Effect Schema for EID validation.
 */
// Identity-encoded schema (`Schema<EID, EID>`) so consumers can refine generic
// schemas without the encode/decode types diverging. `Schema.filter` produces a refinement
// with `Encoded = string`; we narrow the encoded form too with `as unknown as` since the
// runtime representation is identical (a branded string).
const Schema_: Schema.Schema<EID, EID> = Schema.String.pipe(
  Schema.filter((value): value is EID => isEID(value), {
    message: () => 'Invalid EID: must start with echo:',
  }),
  Schema.annotations({
    title: 'EID',
    description: 'ECHO object/space URI: echo://<spaceId>[/<objectId>] or echo:/<objectId>',
  }),
) as unknown as Schema.Schema<EID, EID>;
export { Schema_ as Schema };
