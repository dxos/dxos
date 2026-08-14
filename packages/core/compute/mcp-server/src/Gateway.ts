//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as snapshotInternal from './internal/snapshot';

// `Error` below shadows the global, so the instance check names it explicitly.
const errorMessage = (error: unknown): string => (error instanceof globalThis.Error ? error.message : String(error));

/**
 * Failure of the host's link to the registry — an outage, not an authorship error. Projection
 * degrades to the static surface on this; `skillLoad` reports it, so "unknown skill" always means
 * the name was wrong.
 */
export class Error extends Schema.TaggedError<Error>('GatewayError')('GatewayError', {
  message: Schema.String,
}) {}

/** Builds a {@link Error} from anything thrown, so hosts do not each unwrap causes their own way. */
export const error = (cause: unknown): Error => new Error({ message: errorMessage(cause) });

/**
 * An operation registry record in wire form: `Obj.toJSON` of a `PersistentOperation`, i.e. meta as
 * a plain `@meta` property carrying `key` and `annotations`, and input/output as JSON Schema.
 */
export type OperationRecord = Record<string, unknown>;

/** A skill definition flattened for the wire, with its instructions text materialized. */
export type SkillRecord = {
  readonly key: string;
  readonly name?: string;
  readonly description?: string;
  readonly instructions?: string;
  /** Whether the skill opted into MCP projection (`Skill.McpPromptAnnotation`). */
  readonly mcpPrompt?: boolean;
};

export type InvokeRequest = {
  /** Operation key without the `dxn:` prefix. */
  readonly key: string;
  readonly input?: unknown;
  readonly spaceId?: string;
};

export type Shape = {
  readonly listOperations: Effect.Effect<readonly OperationRecord[], Error>;
  readonly listSkills: Effect.Effect<readonly SkillRecord[], Error>;
  readonly invokeOperation: (request: InvokeRequest) => Effect.Effect<unknown, Error>;
  /**
   * Spaces this session may address; the first is the fallback when a call omits `spaceId`.
   * Empty means unrestricted, which only a host without a grant model (e.g. the local CLI) sets.
   */
  readonly spaceIds: readonly string[];
};

/**
 * The host's link to the operation registry: everything the projection needs from the outside
 * world, and the whole of what a host supplies. Reaching the registry over a Cloudflare service
 * binding or through an in-process plugin manager is a host concern; what the model sees is not.
 */
export class Service extends Context.Service<Service, Shape>()('@dxos/mcp-server/Gateway') {}

/**
 * Replaces live ECHO entities in an operation's result with wire snapshots — what every gateway
 * must return, whatever it invoked. An operation returning a live object is right in-process, but a
 * proxy carries none of its properties through JSON.
 */
export const snapshot = snapshotInternal.entities;
