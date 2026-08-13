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
 * enrichment this way, which is what keeps plugin-inbox from importing it (the dependency runs the
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
