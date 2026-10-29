//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

/**
 * Determines how new comment threads (on any subject) are wired up to the comment-thread AI agent.
 * The agent's identity (name, DID) is resolved at runtime via the AgentIdentity capability - this
 * setting only controls whether and when the agent fires.
 *
 * - `off`: comments are plain user-only threads (no agent).
 * - `auto`: every user message in a thread triggers an agent response.
 * - `mention`: agent only responds when the message contains `@{agentName}`.
 */
export const CommentAgentMode = Schema.Union([
  Schema.Literal('off'),
  Schema.Literal('auto'),
  Schema.Literal('mention'),
]);
export type CommentAgentMode = Schema.Schema.Type<typeof CommentAgentMode>;

/**
 * Plugin settings.
 */
export const Settings = Schema.Struct({
  commentAgentMode: Schema.optional(
    CommentAgentMode.annotate({
      title: 'Comment agent mode',
      description:
        "How new comment threads are processed: 'auto' (AI responds to every user message), or 'mention' (AI responds only on @mention, the default).",
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
