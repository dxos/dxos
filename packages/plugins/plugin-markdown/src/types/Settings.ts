//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { EditorInputMode, EditorViewMode } from '@dxos/ui-editor/types';

/**
 * Determines how new comment threads on markdown documents are wired up to
 * the comment-thread AI agent (plugin-thread). The agent's identity (name,
 * DID) is resolved at runtime via the AgentIdentity capability — this
 * setting only controls whether and when the agent fires.
 *
 * - `off`: comments are plain user-only threads (no agent).
 * - `auto`: every user message in a thread triggers an agent response.
 * - `mention`: agent only responds when the message contains `@{agentName}`.
 */
export const CommentAgentMode = Schema.Union(Schema.Literal('off'), Schema.Literal('auto'), Schema.Literal('mention'));
export type CommentAgentMode = Schema.Schema.Type<typeof CommentAgentMode>;

/**
 * How document version comparisons are rendered.
 */
export const DiffViewMode = Schema.Union(
  Schema.Literal('inline'),
  Schema.Literal('sideBySide'),
  Schema.Literal('gutter'),
  Schema.Literal('suggest'),
);
export type DiffViewMode = Schema.Schema.Type<typeof DiffViewMode>;

/**
 * Plugin settings.
 */
export const Settings = Schema.mutable(
  Schema.Struct({
    defaultViewMode: EditorViewMode.annotations({
      title: 'Default view mode',
      description: 'Set whether documents open in editing or read-only mode.',
    }),
    commentAgentMode: Schema.optional(
      CommentAgentMode.annotations({
        title: 'Comment agent mode',
        description:
          "How new comment threads on markdown documents are processed: 'off' (no AI), 'auto' (AI responds to every user message), or 'mention' (AI responds only on @mention).",
      }),
    ),
    editorInputMode: Schema.optional(
      EditorInputMode.annotations({
        title: 'Editor input mode',
        description: 'Choose keyboard bindings for the editor.',
      }),
    ),
    toolbar: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Show toolbar',
        description: 'Display a formatting toolbar above the editor.',
      }),
    ),
    numberedHeadings: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Numbered headings',
        description: 'Automatically number heading levels in the document.',
      }),
    ),
    diffView: Schema.optional(
      DiffViewMode.annotations({
        title: 'Diff view',
        description:
          "How document version comparisons are rendered: 'inline' (unified), 'sideBySide' (two panes), 'gutter' (change bars), or 'suggest' (accept/reject each change over the parent).",
      }),
    ),
    folding: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Folding',
        description: 'Allow collapsing and expanding sections by heading.',
      }),
    ),
    experimental: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Enable experimental features',
        description: 'Turn on features that are still in development.',
      }),
    ),
    debug: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Enable debugging features',
        description: 'Show developer tools and diagnostics for the editor.',
      }),
    ),
    snippets: Schema.optional(
      Schema.String.annotations({
        title: 'Snippets',
        description: 'Input snippets to replay for testing purposes.',
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
