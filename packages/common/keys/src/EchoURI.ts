//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import type { ObjectId } from './object-id';
import type { SpaceId } from './space-id';
import type * as URI from './URI';

// Canonical-form regex covering all three EchoURI shapes.
//   echo://<spaceId>/<objectId>
//   echo://<spaceId>
//   echo:/<objectId>      (local)
//   echo:///<objectId>    (local, alt form)
const ECHO_URI_REGEXP = /^echo:(?:\/\/[^/]+(?:\/[^/]+)?|(?:\/\/\/|\/)[^/]+)$/;

// Sub-patterns used for extraction.
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
export const isEchoURI = (value: unknown): value is EchoURI =>
  typeof value === 'string' &&
  (value.startsWith('echo:') || value.startsWith('dxn:echo:') || value.startsWith('dxn:queue:'));

/**
 * Parses a string to EchoURI, normalizing legacy formats to the canonical `echo:` form.
 * Throws if the (normalized) string is not a valid EchoURI.
 */
export const parse = (uri: string): EchoURI => {
  const normalized = normalizeLegacy(uri);
  if (!ECHO_URI_REGEXP.test(normalized)) {
    throw new Error(`Invalid EchoURI: ${uri}`);
  }
  return normalized as EchoURI;
};

/**
 * Like `parse` but returns undefined on failure instead of throwing.
 */
export const tryParse = (uri: string): EchoURI | undefined => {
  try {
    return parse(uri);
  } catch {
    return undefined;
  }
};

const normalizeLegacy = (uri: string): string => {
  if (uri.startsWith('echo:')) {
    return uri;
  }

  const localMatch = LEGACY_LOCAL_RE.exec(uri);
  if (localMatch) {
    return `echo:/${localMatch[1]}`;
  }

  // Check queue item (more specific) before queue.
  const queueItemMatch = LEGACY_QUEUE_ITEM_RE.exec(uri);
  if (queueItemMatch) {
    return `echo://${queueItemMatch[1]}/${queueItemMatch[3]}`;
  }

  const queueMatch = LEGACY_QUEUE_RE.exec(uri);
  if (queueMatch) {
    return `echo://${queueMatch[1]}/${queueMatch[2]}`;
  }

  const qualifiedMatch = LEGACY_QUALIFIED_RE.exec(uri);
  if (qualifiedMatch) {
    return `echo://${qualifiedMatch[1]}/${qualifiedMatch[2]}`;
  }

  return uri;
};

/**
 * Constructs an EchoURI. Validates the result via `parse`.
 *
 * - `{ spaceId, objectId }` → `echo://<spaceId>/<objectId>` (fully qualified)
 * - `{ objectId }`          → `echo:/<objectId>` (local — current space)
 * - `{ spaceId }`           → `echo://<spaceId>` (space-only)
 *
 * Throws if neither id is provided, or if the result is not a valid EchoURI.
 */
export const make = ({ spaceId, objectId }: { spaceId?: SpaceId; objectId?: ObjectId }): EchoURI => {
  let raw: string;
  if (spaceId != null && objectId != null) {
    raw = `echo://${spaceId}/${objectId}`;
  } else if (objectId != null) {
    raw = `echo:/${objectId}`;
  } else if (spaceId != null) {
    raw = `echo://${spaceId}`;
  } else {
    throw new Error('EchoURI.make requires at least one of spaceId or objectId');
  }
  return parse(raw);
};

/**
 * Returns the SpaceId from a fully-qualified EchoURI, or undefined for local refs.
 */
export const getSpaceId = (uri: EchoURI): SpaceId | undefined => {
  const normalized = parse(uri);
  const match = QUALIFIED_RE.exec(normalized) ?? SPACE_ONLY_RE.exec(normalized);
  return match?.[1] as SpaceId | undefined;
};

/**
 * Returns the ObjectId from an EchoURI, or undefined for space-only refs.
 */
export const getObjectId = (uri: EchoURI): ObjectId | undefined => {
  const normalized = parse(uri);
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
export const isLocal = (uri: EchoURI): boolean => {
  const normalized = parse(uri);
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
  Schema.filter((value): value is EchoURI => isEchoURI(value), {
    message: () => 'Invalid EchoURI: must start with echo:, dxn:echo:, or dxn:queue:',
  }),
  Schema.annotations({
    title: 'EchoURI',
    description: 'ECHO object/space URI: echo://<spaceId>[/<objectId>] or echo:/<objectId>',
  }),
) as unknown as Schema.Schema<EchoURI, EchoURI>;
export { Schema_ as Schema };
