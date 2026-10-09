//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN } from '@dxos/keys';

/** Harness id of Composer's own agent loop. */
export const COMPOSER_HARNESS = 'composer';

/**
 * How an AI session runs: the settings a chat pins for itself, or a project sets as the default for
 * the sessions it starts. Every field is optional; an unset one falls back to the next default out
 * (the project's, then the agent's).
 */
export const SessionConfig = Schema.Struct({
  /** The model the session runs on, as the model's DXN (see `Model`). */
  model: Schema.optional(DXN.Schema),

  /** The agent that runs the session, by the id its plugin registered (`composer`, `claude-code`, …). */
  harness: Schema.optional(Schema.String),

  /** HALO device key (hex) of the device that runs an external harness; only that device drives it. */
  host: Schema.optional(Schema.String),

  /**
   * Key of the durable process definition that runs the session's agent, as a plugin contributed it.
   * Unset runs the assistant's own agent process.
   */
  process: Schema.optional(Schema.String),
});

export interface SessionConfig extends Schema.Schema.Type<typeof SessionConfig> {}

/** The session's harness; chats written before `harness` existed ran Composer's own loop. */
export const harnessOf = (config: SessionConfig | undefined): string => config?.harness ?? COMPOSER_HARNESS;
