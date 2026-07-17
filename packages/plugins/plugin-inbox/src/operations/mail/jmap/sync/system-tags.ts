//
// Copyright 2026 DXOS.org
//

import { type SystemTags } from '../../../../types';

/**
 * JMAP mailbox role → canonical system tag ({@link SystemTags.SystemTag}). Roles absent here are
 * intentionally dropped: `archive` is derived as "not in inbox" (Gmail's model), and
 * `drafts`/`trash`/`junk` are never synced.
 */
export const JMAP_ROLE_TAGS: Partial<Record<string, SystemTags.SystemTagId>> = {
  inbox: 'inbox',
  sent: 'sent',
};

/**
 * JMAP keyword → canonical system tag ({@link SystemTags.SystemTag}). Only `$flagged` (starred) is
 * projected. Read-state (`$seen`) and the rest (`$answered`, `$draft`, `$forwarded`, …) are
 * intentionally dropped — high-churn and noisier than useful. Kept as an explicit omission in case we
 * want them later.
 */
export const JMAP_KEYWORD_TAGS: Partial<Record<string, SystemTags.SystemTagId>> = {
  $flagged: 'starred',
};
