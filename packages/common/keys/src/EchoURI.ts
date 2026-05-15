//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import type { ObjectId } from './object-id';
import type { SpaceId } from './space-id';
import type * as URI from './URI';

// New format patterns.
const QUALIFIED_RE = /^echo:\/\/([^/]+)\/([^/]+)$/;
const SPACE_ONLY_RE = /^echo:\/\/([^/]+)$/;
const LOCAL_RE = /^echo:(?:\/\/\/|\/)([^/]+)$/;

// Legacy format patterns (backward-compat parse).
const LEGACY_LOCAL_RE = /^dxn:echo:@:([^:]+)$/;
const LEGACY_QUALIFIED_RE = /^dxn:echo:([^:@][^:]*):([^:]+)$/;
const LEGACY_QUEUE_ITEM_RE = /^dxn:queue:[^:]+:([^:]+):([^:]+):([^:]+)$/;
const LEGACY_QUEUE_RE = /^dxn:queue:[^:]+:([^:]+):([^:]+)$/;

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
export type EchoURI = URI.URI & { readonly __EchoURI: unique symbol };

/**
 * Returns true if the value is a valid EchoURI (new or legacy format).
 */
export const isEchoId = (s: unknown): s is EchoURI =>
  typeof s === 'string' && (s.startsWith('echo:') || s.startsWith('dxn:echo:') || s.startsWith('dxn:queue:'));

/**
 * Parses a string to EchoURI, normalizing legacy formats to the canonical `echo:` form.
 */
export const parse = (s: string): EchoURI => {
  if (s.startsWith('echo:')) {
    return s as EchoURI;
  }

  const localMatch = LEGACY_LOCAL_RE.exec(s);
  if (localMatch) {
    return `echo:/${localMatch[1]}` as EchoURI;
  }

  // Check queue item (more specific) before queue.
  const queueItemMatch = LEGACY_QUEUE_ITEM_RE.exec(s);
  if (queueItemMatch) {
    return `echo://${queueItemMatch[1]}/${queueItemMatch[3]}` as EchoURI;
  }

  const queueMatch = LEGACY_QUEUE_RE.exec(s);
  if (queueMatch) {
    return `echo://${queueMatch[1]}/${queueMatch[2]}` as EchoURI;
  }

  const qualifiedMatch = LEGACY_QUALIFIED_RE.exec(s);
  if (qualifiedMatch) {
    return `echo://${qualifiedMatch[1]}/${qualifiedMatch[2]}` as EchoURI;
  }

  throw new Error(`Invalid EchoURI: ${s}`);
};

/**
 * Like `parse` but returns undefined on failure instead of throwing.
 */
export const tryParse = (s: string): EchoURI | undefined => {
  try {
    return parse(s);
  } catch {
    return undefined;
  }
};

/**
 * Creates a fully-qualified EchoURI addressing an object in a specific space.
 * @example `echo://BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE/01J00J9B45YHYSGZQTQMSKMGJ6`
 */
export const fromSpaceAndObjectId = (spaceId: SpaceId, objectId: ObjectId): EchoURI =>
  `echo://${spaceId}/${objectId}` as EchoURI;

/**
 * Creates a local EchoURI for an object in the current space.
 * @example `echo:/01J00J9B45YHYSGZQTQMSKMGJ6`
 */
export const fromLocalObjectId = (objectId: ObjectId): EchoURI => `echo:/${objectId}` as EchoURI;

/**
 * Creates an EchoURI referencing a space itself (no object).
 * @example `echo://BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE`
 */
export const fromSpaceId = (spaceId: SpaceId): EchoURI => `echo://${spaceId}` as EchoURI;

/**
 * Returns the SpaceId from a fully-qualified EchoURI, or undefined for local refs.
 */
export const getSpaceId = (id: EchoURI): SpaceId | undefined => {
  const normalized = parse(id);
  const match = QUALIFIED_RE.exec(normalized) ?? SPACE_ONLY_RE.exec(normalized);
  return match?.[1] as SpaceId | undefined;
};

/**
 * Returns the ObjectId from an EchoURI, or undefined for space-only refs.
 */
export const getObjectId = (id: EchoURI): ObjectId | undefined => {
  const normalized = parse(id);
  const qualMatch = QUALIFIED_RE.exec(normalized);
  if (qualMatch) {
    return qualMatch[2] as ObjectId;
  }
  const localMatch = LOCAL_RE.exec(normalized);
  return localMatch?.[1] as ObjectId | undefined;
};

/**
 * Returns true if the EchoURI is a local reference (no authority/space).
 */
export const isLocal = (id: EchoURI): boolean => {
  const normalized = parse(id);
  return LOCAL_RE.test(normalized);
};

/**
 * Returns true if the two EchoURIs refer to the same object, normalizing both first.
 */
export const equals = (a: EchoURI, b: EchoURI): boolean => parse(a) === parse(b);

/**
 * Effect Schema for EchoURI validation.
 */
// Identity-encoded schema (`Schema<EchoURI, EchoURI>`) so consumers can refine generic
// schemas without the encode/decode types diverging. `Schema.filter` produces a refinement
// with `Encoded = string`; we narrow the encoded form too with `as unknown as` since the
// runtime representation is identical (a branded string).
const Schema_: Schema.Schema<EchoURI, EchoURI> = Schema.String.pipe(
  Schema.filter((s): s is EchoURI => isEchoId(s), {
    message: () => 'Invalid EchoURI: must start with echo:, dxn:echo:, or dxn:queue:',
  }),
) as unknown as Schema.Schema<EchoURI, EchoURI>;
export { Schema_ as Schema };
