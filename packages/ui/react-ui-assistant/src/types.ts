//
// Copyright 2026 DXOS.org
//

// Also exported as the UI-free `./types` entry: a plugin's workerd module consumes `ChatView`
// without dragging the package's React surface (and so `@dxos/react-ui`) into a non-DOM runtime.

import * as Schema from 'effect/Schema';

/**
 * Which projection of the thread the reader sees. A view is a filter over blocks, applied by the
 * renderer — the model always carries everything.
 *
 * - `summary`: only conversational text (prompts and replies).
 * - `normal`: everything except reasoning.
 * - `thinking`: everything, reasoning included.
 * - `debug`: every block, raw fallbacks visible.
 */
export const ChatView = Schema.Union([
  Schema.Literal('normal').annotate({ title: 'Normal' }),
  Schema.Literal('summary').annotate({ title: 'Summary' }),
  Schema.Literal('thinking').annotate({ title: 'Thinking' }),
  Schema.Literal('debug').annotate({ title: 'Debug' }),
]);
export type ChatView = Schema.Schema.Type<typeof ChatView>;

/**
 * What the thread reports outward. Deliberately the same shapes the assistant plugin's event bus
 * speaks, so a host can pipe these straight through.
 */
export type ChatThreadEvent =
  /** A suggestion or select option was chosen — the text is ready to submit. */
  | { type: 'submit'; text: string }
  /** Soft-fork the thread from the given message (the prompt toolbar's rewind). */
  | { type: 'rewind'; id: string };
