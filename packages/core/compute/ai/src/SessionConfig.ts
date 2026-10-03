//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN } from '@dxos/keys';

/**
 * How an AI session runs: the settings a chat pins for itself, or a project sets as the default for
 * the sessions it starts. Every field is optional; an unset one falls back to the next default out
 * (the project's, then the agent's).
 */
export const SessionConfig = Schema.Struct({
  /** The model the session runs on, as the model's DXN (see `Model`). */
  model: Schema.optional(DXN.Schema),
});

export interface SessionConfig extends Schema.Schema.Type<typeof SessionConfig> {}
