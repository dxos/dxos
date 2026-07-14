//
// Copyright 2026 DXOS.org
//

import { type TopicDraft } from '@dxos/pipeline-email';

// Turn clustered topic drafts into the ordered, filtered list written to `Mailbox.topicSuggestions`.
// Two signals from the live review (spec 2026-07-12): bulk-dominated clusters are the low-utility
// noise and are suppressed entirely; clusters with a known-person participant are surfaced first.

export type OrderSuggestionsInput = {
  readonly drafts: readonly TopicDraft[];
  /** Thread ids (normalized subjects) whose messages are majority-`bulk`. */
  readonly bulkThreadIds: ReadonlySet<string>;
  /** Lowercased emails of known `Person` records. */
  readonly personEmails: ReadonlySet<string>;
  /** Labels already materialized as `Topic`s or already suggested (dedup). */
  readonly existingLabels: ReadonlySet<string>;
};

/** A cluster is bulk when a strict majority of its member threads are bulk. */
export const isBulkCluster = (draft: TopicDraft, bulkThreadIds: ReadonlySet<string>): boolean => {
  if (draft.threadIds.length === 0) {
    return false;
  }
  const bulk = draft.threadIds.filter((threadId) => bulkThreadIds.has(threadId)).length;
  return bulk * 2 > draft.threadIds.length;
};

/** Whether any participant is a known person. */
export const isPersonLinked = (draft: TopicDraft, personEmails: ReadonlySet<string>): boolean =>
  draft.participants.some((email) => personEmails.has(email.toLowerCase()));

/**
 * Drop bulk-dominated clusters, dedup by label (against existing topics/suggestions and within the
 * batch), and order person-linked clusters first (stable within each group). Pure.
 */
export const orderSuggestions = ({
  drafts,
  bulkThreadIds,
  personEmails,
  existingLabels,
}: OrderSuggestionsInput): TopicDraft[] => {
  // Dedup case-insensitively — LLM-generated labels differing only in casing are the same topic.
  const seen = new Set(Array.from(existingLabels, (label) => label.toLowerCase()));
  const kept: TopicDraft[] = [];
  for (const draft of drafts) {
    if (seen.has(draft.label.toLowerCase()) || isBulkCluster(draft, bulkThreadIds)) {
      continue;
    }
    seen.add(draft.label.toLowerCase());
    kept.push(draft);
  }

  // Stable person-first sort (preserve original order within each group).
  return kept
    .map((draft, index) => ({ draft, index, person: isPersonLinked(draft, personEmails) }))
    .sort((left, right) => (left.person === right.person ? left.index - right.index : left.person ? -1 : 1))
    .map((entry) => entry.draft);
};
