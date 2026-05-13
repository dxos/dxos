//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type ObjectId } from './object-id';
import { type SpaceId } from './space-id';
import type { URI } from './uri';

// New format patterns.
const QUALIFIED_RE = /^echo:\/\/([^/]+)\/([^/]+)$/;
const SPACE_ONLY_RE = /^echo:\/\/([^/]+)$/;
const LOCAL_RE = /^echo:(?:\/\/\/|\/)([^/]+)$/;

// Legacy format patterns for backward-compat parse.
const LEGACY_LOCAL_RE = /^dxn:echo:@:([^:]+)$/;
const LEGACY_QUALIFIED_RE = /^dxn:echo:([^:@][^:]*):([^:]+)$/;
const LEGACY_QUEUE_ITEM_RE = /^dxn:queue:[^:]+:([^:]+):([^:]+):([^:]+)$/;
const LEGACY_QUEUE_RE = /^dxn:queue:[^:]+:([^:]+):([^:]+)$/;

const _isEchoId = (s: unknown): s is EchoId =>
  typeof s === 'string' &&
  (s.startsWith('echo:') || s.startsWith('dxn:echo:') || s.startsWith('dxn:queue:'));

/**
 * Addresses a specific ECHO object or space. Uses the `echo:` URI scheme.
 *
 * @example
 * ```
 * echo://BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE/01J00J9B45YHYSGZQTQMSKMGJ6
 * echo:/01J00J9B45YHYSGZQTQMSKMGJ6
 * echo://BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE
 * ```
 */
export type EchoId = string & { readonly __EchoId: unique symbol } & URI;

export const EchoId: Schema.Schema<EchoId, string> & {
  /**
   * Returns true if the string is a valid EchoId (new or legacy format).
   */
  isEchoId(s: unknown): s is EchoId;

  /**
   * Parses a string to EchoId, normalizing legacy formats to the canonical `echo:` form.
   */
  parse(s: string): EchoId;

  /**
   * Like `parse` but returns undefined on failure instead of throwing.
   */
  tryParse(s: string): EchoId | undefined;

  /**
   * Creates a fully-qualified EchoId addressing an object in a specific space.
   * @example `echo://BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE/01J00J9B45YHYSGZQTQMSKMGJ6`
   */
  fromSpaceAndObjectId(spaceId: SpaceId, objectId: ObjectId): EchoId;

  /**
   * Creates a local EchoId for an object in the current space.
   * @example `echo:/01J00J9B45YHYSGZQTQMSKMGJ6`
   */
  fromLocalObjectId(objectId: ObjectId): EchoId;

  /**
   * Creates an EchoId referencing a space itself (no object).
   * @example `echo://BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE`
   */
  fromSpaceId(spaceId: SpaceId): EchoId;

  /**
   * Returns the SpaceId from a fully-qualified EchoId, or undefined for local refs.
   */
  getSpaceId(id: EchoId): SpaceId | undefined;

  /**
   * Returns the ObjectId from an EchoId, or undefined for space-only refs.
   */
  getObjectId(id: EchoId): ObjectId | undefined;

  /**
   * Returns true if the EchoId is a local reference (no authority/space).
   */
  isLocal(id: EchoId): boolean;

  /**
   * Returns true if the two EchoIds refer to the same object, normalizing both first.
   */
  equals(a: EchoId, b: EchoId): boolean;
} = class extends Schema.String.pipe(
  Schema.filter(_isEchoId, {
    message: () => 'Invalid EchoId: must start with echo:, dxn:echo:, or dxn:queue:',
  }),
) {
  static isEchoId = _isEchoId;

  static parse(s: string): EchoId {
    if (s.startsWith('echo:')) {
      return s as EchoId;
    }

    // Legacy: dxn:echo:@:<objectId> → echo:/<objectId>
    const localMatch = LEGACY_LOCAL_RE.exec(s);
    if (localMatch) {
      return `echo:/${localMatch[1]}` as EchoId;
    }

    // Check queue item before queue (more specific match first).
    // Legacy: dxn:queue:<sub>:<spaceId>:<queueId>:<objectId> → echo://<spaceId>/<objectId>
    const queueItemMatch = LEGACY_QUEUE_ITEM_RE.exec(s);
    if (queueItemMatch) {
      return `echo://${queueItemMatch[1]}/${queueItemMatch[3]}` as EchoId;
    }

    // Legacy: dxn:queue:<sub>:<spaceId>:<queueId> → echo://<spaceId>/<queueId>
    const queueMatch = LEGACY_QUEUE_RE.exec(s);
    if (queueMatch) {
      return `echo://${queueMatch[1]}/${queueMatch[2]}` as EchoId;
    }

    // Legacy: dxn:echo:<spaceId>:<objectId> → echo://<spaceId>/<objectId>
    const qualifiedMatch = LEGACY_QUALIFIED_RE.exec(s);
    if (qualifiedMatch) {
      return `echo://${qualifiedMatch[1]}/${qualifiedMatch[2]}` as EchoId;
    }

    throw new Error(`Invalid EchoId: ${s}`);
  }

  static tryParse(s: string): EchoId | undefined {
    try {
      return EchoId.parse(s);
    } catch {
      return undefined;
    }
  }

  static fromSpaceAndObjectId(spaceId: SpaceId, objectId: ObjectId): EchoId {
    return `echo://${spaceId}/${objectId}` as EchoId;
  }

  static fromLocalObjectId(objectId: ObjectId): EchoId {
    return `echo:/${objectId}` as EchoId;
  }

  static fromSpaceId(spaceId: SpaceId): EchoId {
    return `echo://${spaceId}` as EchoId;
  }

  static getSpaceId(id: EchoId): SpaceId | undefined {
    const normalized = EchoId.parse(id);
    const match = QUALIFIED_RE.exec(normalized) ?? SPACE_ONLY_RE.exec(normalized);
    return match?.[1] as SpaceId | undefined;
  }

  static getObjectId(id: EchoId): ObjectId | undefined {
    const normalized = EchoId.parse(id);
    const qualMatch = QUALIFIED_RE.exec(normalized);
    if (qualMatch) {
      return qualMatch[2] as ObjectId;
    }
    const localMatch = LOCAL_RE.exec(normalized);
    return localMatch?.[1] as ObjectId | undefined;
  }

  static isLocal(id: EchoId): boolean {
    const normalized = EchoId.parse(id);
    return LOCAL_RE.test(normalized);
  }

  static equals(a: EchoId, b: EchoId): boolean {
    return EchoId.parse(a) === EchoId.parse(b);
  }
};
