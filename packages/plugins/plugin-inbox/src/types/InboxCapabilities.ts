//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

// Inline import to avoid `Settings` namespace alias colliding with the
// `Settings` capability export below.
export const Settings = Capability.makeSingleton<Atom.Writable<import('./Settings').Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

/**
 * Plugins contribute object extractors via this capability.
 * Multiple plugins may register; the ExtractMessage operation selects one based on match() confidence.
 */
export const ObjectExtractor = Capability.make<import('@dxos/extractor').ObjectExtractor>()(
  `${meta.profile.key}.capability.objectExtractor`,
);

/**
 * A mailbox-scoped action injected into the MailboxArticle toolbar menu. A plugin contributes the
 * operation to run plus the input built from the target mailbox (e.g. plugin-brain contributes
 * `Analyze` → `AnalyzeMailbox`); the toolbar renders each as a menu item and invokes it scoped to the
 * mailbox's space.
 */
export type MailboxAction = {
  /** Stable id (menu item key). */
  id: string;
  /** Menu item label (literal string, shown verbatim). */
  label: string;
  /** Optional phosphor icon name. */
  icon?: string;
  /**
   * Builds the operation invocation for the target mailbox. The `operation` is returned from this
   * closure (not held as a value property) so the contributed capability value stays plain data —
   * embedding an Effect `Operation.Definition` directly makes the capability atom read recurse.
   */
  createInvocation: (mailbox: import('./Mailbox').Mailbox) => {
    operation: import('@dxos/compute').Operation.Definition.Any;
    input: unknown;
  };
};

// Multi: `useCapabilities`/`getAll` readers render one menu item per contributed action, and more
// than one plugin may contribute (currently plugin-brain).
/** Plugins contribute mailbox toolbar-menu actions via this capability (see {@link MailboxAction}). */
export const MailboxAction = Capability.make<MailboxAction>()(`${meta.profile.key}.capability.mailboxAction`);

/**
 * A sender-scoped action injected into the per-message conversation menu. Mirrors {@link MailboxAction}
 * but targets the person who sent the message rather than the mailbox — plugin-crm contributes
 * research this way, which is what keeps plugin-inbox from importing it (the dependency runs the
 * other way).
 */
export type SenderAction = {
  /** Stable id (menu item key). */
  id: string;
  /** Menu item label (literal string, shown verbatim). */
  label: string;
  /** Optional phosphor icon name. */
  icon?: string;
  /**
   * Builds the invocations to run for a sender, in order. Returns a LIST because the useful actions are
   * composites — research then image, say — and a contributor should not have to model that as one
   * operation. Returning an empty list means the action does not apply to this sender (e.g. no email),
   * and the menu item is omitted.
   *
   * A closure rather than value properties, for the same reason as {@link MailboxAction}: holding an
   * `Operation.Definition` on the capability value makes the capability atom read recurse.
   */
  createInvocations: (actor: import('@dxos/types').Actor.Actor) => {
    operation: import('@dxos/compute').Operation.Definition.Any;
    input: unknown;
  }[];
};

// Multi: one menu item per contributed action; more than one plugin may contribute.
/** Plugins contribute sender-scoped conversation-menu actions via this capability. */
export const SenderAction = Capability.make<SenderAction>()(`${meta.profile.key}.capability.senderAction`);

/** Run-scoped settings the cascade passes to every processor; each uses only what it needs. */
export type MailboxProcessorOptions = {
  /** The user's own addresses, for processors that derive a relationship from them. */
  readonly me: readonly string[];
  /** Message cap for processors that batch. */
  readonly batchLimit?: number;
  /** Model name for LLM processors; each defaults its own. */
  readonly model?: string;
  /** AI provider id (e.g. ollama). */
  readonly provider?: string;
  /** Attempt strict structured output; set false for weak local models. */
  readonly strict?: boolean;
};

/**
 * One cursored pass over a mailbox feed, contributed by whichever plugin owns it — a node in the
 * topology {@link import('./InboxOperation').AnalyzeMailbox} resolves and runs.
 *
 * This is the seam that keeps the cascade open: a plugin owning a pass contributes it here rather
 * than plugin-inbox enumerating every pass it must know about. It is deliberately NOT the same thing
 * as `@dxos/pipeline`'s `Stage`, which is a stream transform *within* one run; a processor is coarser
 * — an independently-cursored, separately-spawned operation.
 */
export type MailboxProcessor = {
  /**
   * Stable id. Doubles as the topology key and as the tag its feed cursor carries, so a processor's
   * watermark is its own — two processors sharing an id would silently skip each other's work.
   */
  id: string;
  /** Cost class: what the `tiers` filter selects on, and how a run is reported. */
  tier: import('./InboxOperation').MailboxTier;
  /**
   * Ids this processor must run after. Unknown ids are ignored rather than failing the run — naming a
   * processor whose plugin is not installed is the normal case for an optional dependency.
   */
  after?: readonly string[];
  /**
   * Builds this pass's invocations for one run, or returns a reason it cannot run against this
   * mailbox (reported as skipped rather than attempted).
   *
   * A LIST because a pass is not always about the mailbox as a whole: one scoped to something
   * narrower — a Project tracking part of a shared feed — has one invocation per subject, and each
   * needs its own cursor. An empty list means the pass had nothing to run and is reported as such,
   * distinctly from a skip.
   *
   * A closure rather than value properties, for the same reason as {@link MailboxAction}: holding an
   * `Operation.Definition` on the capability value makes the capability atom read recurse.
   */
  createInvocations: (
    mailbox: import('./Mailbox').Mailbox,
    options: MailboxProcessorOptions,
  ) =>
    | {
        /**
         * What this invocation's cursor is about. Defaults to the mailbox; a pass covering several
         * subjects sets it per entry so their watermarks stay independent.
         */
        subject?: import('@dxos/echo').Obj.Any;
        operation: import('@dxos/compute').Operation.Definition.Any;
        input: unknown;
      }[]
    | { skip: string };
};

// Multi: the whole point is that several plugins contribute; plugin-inbox contributes its own passes
// through the same seam rather than privileging them.
/** Plugins contribute mailbox feed processors via this capability (see {@link MailboxProcessor}). */
export const MailboxProcessor = Capability.make<MailboxProcessor>()(`${meta.profile.key}.capability.mailboxProcessor`);

/**
 * The operation that drafts an AI reply, contributed by whichever plugin can ground one.
 *
 * A seam rather than a direct call because the generator needs a fact store that only plugin-brain
 * provides, while the surfaces that offer the affordance are plugin-inbox's — and the dependency runs
 * brain → inbox. Without a contribution the message surfaces omit the AI-reply affordance entirely,
 * which is the honest behaviour: there is nothing to invoke.
 */
export type ReplyGenerator = {
  /** Stable id; the first contribution wins if several are present. */
  id: string;
  /**
   * Returns the generator operation, typed against the shared {@link ReplyGeneration} contract so a
   * contributor cannot supply one the surfaces can't call. A closure rather than a value property, for
   * the same reason as {@link MailboxAction}: holding an `Operation.Definition` on the capability value
   * makes the capability atom read recurse.
   */
  getOperation: () => import('@dxos/compute').Operation.Definition<
    import('./ReplyGeneration').Input,
    import('./ReplyGeneration').Output
  >;
};

/** Plugins contribute AI reply generation via this capability (see {@link ReplyGenerator}). */
export const ReplyGenerator = Capability.make<ReplyGenerator>()(`${meta.profile.key}.capability.replyGenerator`);

/**
 * The send operation a mail provider handles outbound drafts with. Each provider plugin contributes one
 * entry keyed by its `Connector.id`, so the composer routes a draft by its mailbox binding's
 * `Connection.connectorId` without naming any provider.
 */
export type MailSendOperation = {
  /** The contributing provider's `Connector.id` (matched against `Connection.connectorId`). */
  connectorId: string;
  /**
   * Returns the send operation, typed against the shared `MailSend` contract so a provider cannot
   * contribute an operation the composer can't call. A closure rather than a value property for the
   * same reason as {@link MailboxAction}: holding an `Operation.Definition` on the capability value
   * makes the capability atom read recurse.
   */
  getOperation: () => import('@dxos/compute').Operation.Definition<
    import('./MailSend').Input,
    import('./MailSend').Output
  >;
};

/** Mail providers contribute their send operation via this capability (see {@link MailSendOperation}). */
export const MailSendOperation = Capability.make<MailSendOperation>()(
  `${meta.profile.key}.capability.mailSendOperation`,
);
