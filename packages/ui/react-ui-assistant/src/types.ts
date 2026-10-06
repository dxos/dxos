//
// Copyright 2026 DXOS.org
//

// Also exported as the UI-free `./types` entry: a plugin's workerd module consumes `ChatView` and the
// delivery annotation without dragging the package's React surface (and so `@dxos/react-ui`) into a
// non-DOM runtime.

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, Obj } from '@dxos/echo';

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
  | { type: 'rewind'; id: string }
  /** Withdraw a prompt the agent has not taken up (its delivery row's remove). */
  | { type: 'remove-prompt'; id: string }
  /** A person chose one of a request block's options (allow or refuse an agent's tool call). */
  | { type: 'respond'; messageId: string; requestId: string; optionId: string };

/**
 * Where a prompt the reader sent stands on its way to the agent, messenger style.
 *
 * - `sent`: the client holds it (one tick) — shown the moment it is submitted, before anything persists.
 * - `delivered`: the agent's input queue holds it (two ticks); unread until the agent takes it up.
 * - `read`: the agent took it up (two coloured ticks).
 * - `failed`: it never reached the queue; the row offers remove (the agent retries what it receives).
 */
export const DeliveryStatus = Schema.Literals(['sent', 'delivered', 'read', 'failed']);
export type DeliveryStatus = Schema.Schema.Type<typeof DeliveryStatus>;

/**
 * Marks a thread row as a prompt still on its way to the agent. Set only on the transient row the
 * host projects for the thread, never on a persisted message: delivery is a fact about this
 * reader's view of the queue, not about the conversation.
 */
export const DeliveryAnnotation: Annotation.Annotation<DeliveryStatus> = Annotation.make({
  id: 'org.dxos.annotation.delivery',
  schema: DeliveryStatus,
});

/**
 * The row's delivery status, if it has one. Takes any message-shaped value because not every row is an
 * ECHO object: a folded tool run, or a patched streaming copy, is a plain spread, which carries no
 * annotations — and `Annotation.get` throws on one rather than reading it as absent.
 */
export const getDelivery = (message: object): DeliveryStatus | undefined =>
  Obj.isObject(message) || Obj.isSnapshot(message)
    ? Option.getOrUndefined(Annotation.get(message, DeliveryAnnotation))
    : undefined;

/** A row the agent has not taken up yet: it cannot be rewound to, and it can still be removed. */
export const isUnread = (status: DeliveryStatus | undefined): boolean =>
  status === 'sent' || status === 'delivered' || status === 'failed';
