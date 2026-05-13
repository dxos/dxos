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
export type EchoId = string & { readonly __EchoId: unique symbol } & URI.URI;

/**
 * Returns true if the value is a valid EchoId (new or legacy format).
 */
export const isEchoId = (s: unknown): s is EchoId =>
  typeof s === 'string' &&
  (s.startsWith('echo:') || s.startsWith('dxn:echo:') || s.startsWith('dxn:queue:'));

/**
 * Parses a string to EchoId, normalizing legacy formats to the canonical `echo:` form.
 */
export const parse = (s: string): EchoId => {
  if (s.startsWith('echo:')) {
    return s as EchoId;
  }

  const localMatch = LEGACY_LOCAL_RE.exec(s);
  if (localMatch) {
    return `echo:/${localMatch[1]}` as EchoId;
  }

  // Check queue item (more specific) before queue.
  const queueItemMatch = LEGACY_QUEUE_ITEM_RE.exec(s);
  if (queueItemMatch) {
    return `echo://${queueItemMatch[1]}/${queueItemMatch[3]}` as EchoId;
  }

  const queueMatch = LEGACY_QUEUE_RE.exec(s);
  if (queueMatch) {
    return `echo://${queueMatch[1]}/${queueMatch[2]}` as EchoId;
  }

  const qualifiedMatch = LEGACY_QUALIFIED_RE.exec(s);
  if (qualifiedMatch) {
    return `echo://${qualifiedMatch[1]}/${qualifiedMatch[2]}` as EchoId;
  }

  throw new Error(`Invalid EchoId: ${s}`);
};

/**
 * Like `parse` but returns undefined on failure instead of throwing.
 */
export const tryParse = (s: string): EchoId | undefined => {
  try {
    return parse(s);
  } catch {
    return undefined;
  }
};

/**
 * Creates a fully-qualified EchoId addressing an object in a specific space.
 * @example `echo://BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE/01J00J9B45YHYSGZQTQMSKMGJ6`
 */
export const fromSpaceAndObjectId = (spaceId: SpaceId, objectId: ObjectId): EchoId =>
  `echo://${spaceId}/${objectId}` as EchoId;

/**
 * Creates a local EchoId for an object in the current space.
 * @example `echo:/01J00J9B45YHYSGZQTQMSKMGJ6`
 */
export const fromLocalObjectId = (objectId: ObjectId): EchoId => `echo:/${objectId}` as EchoId;

/**
 * Creates an EchoId referencing a space itself (no object).
 * @example `echo://BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE`
 */
export const fromSpaceId = (spaceId: SpaceId): EchoId => `echo://${spaceId}` as EchoId;

/**
 * Returns the SpaceId from a fully-qualified EchoId, or undefined for local refs.
 */
export const getSpaceId = (id: EchoId): SpaceId | undefined => {
  const normalized = parse(id);
  const match = QUALIFIED_RE.exec(normalized) ?? SPACE_ONLY_RE.exec(normalized);
  return match?.[1] as SpaceId | undefined;
};

/**
 * Returns the ObjectId from an EchoId, or undefined for space-only refs.
 */
export const getObjectId = (id: EchoId): ObjectId | undefined => {
  const normalized = parse(id);
  const qualMatch = QUALIFIED_RE.exec(normalized);
  if (qualMatch) {
    return qualMatch[2] as ObjectId;
  }
  const localMatch = LOCAL_RE.exec(normalized);
  return localMatch?.[1] as ObjectId | undefined;
};

/**
 * Returns true if the EchoId is a local reference (no authority/space).
 */
export const isLocal = (id: EchoId): boolean => {
  const normalized = parse(id);
  return LOCAL_RE.test(normalized);
};

/**
 * Returns true if the two EchoIds refer to the same object, normalizing both first.
 */
export const equals = (a: EchoId, b: EchoId): boolean => parse(a) === parse(b);

/**
 * Effect Schema for EchoId validation.
 */
export const Schema_: Schema.Schema<EchoId, string> = Schema.String.pipe(
  Schema.filter(isEchoId, {
    message: () => 'Invalid EchoId: must start with echo:, dxn:echo:, or dxn:queue:',
  }),
) as Schema.Schema<EchoId, string>;
export { Schema_ as Schema };
