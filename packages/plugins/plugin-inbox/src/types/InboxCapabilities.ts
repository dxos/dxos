//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

// Inline import to avoid `Settings` namespace alias colliding with the
// `Settings` capability export below.
export const Settings = Capability.make<Atom.Writable<import('./Settings').Settings>>(
  `${meta.profile.key}.capability.settings`,
);

/**
 * Plugins contribute object extractors via this capability.
 * Multiple plugins may register; the ExtractMessage operation selects one based on match() confidence.
 */
export const ObjectExtractor = Capability.make<import('@dxos/extractor').ObjectExtractor>(
  `${meta.profile.key}.capability.objectExtractor`,
);

/**
 * A mailbox-scoped action injected into the MailboxArticle toolbar menu. A plugin contributes the
 * operation to run plus the input built from the target mailbox (e.g. plugin-brain contributes
 * `Enrich` → `EnrichMailbox`); the toolbar renders each as a menu item and invokes it scoped to the
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

/** Plugins contribute mailbox toolbar-menu actions via this capability (see {@link MailboxAction}). */
export const MailboxAction = Capability.make<MailboxAction>(`${meta.profile.key}.capability.mailboxAction`);
