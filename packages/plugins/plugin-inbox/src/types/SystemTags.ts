//
// Copyright 2026 DXOS.org
//

import { type Database, Tag } from '@dxos/echo';

/**
 * Canonical, provider-agnostic system tags. Each provider maps its own vocabulary onto these — see
 * `operations/mail/google/sync/tags.ts` (Gmail labels) and `operations/mail/jmap/sync/tags.ts` (JMAP
 * mailbox roles + keywords) — so a Gmail star, a JMAP `$flagged` keyword, and a locally-toggled star
 * resolve to the *same* {@link Tag} object, likewise for inbox/sent/etc. Custom user labels/folders keep
 * their own provider-scoped tags (see `findOrCreateGmailTag` in `operations/mail/google/tags.ts` and
 * `findOrCreateJmapTag` in `operations/mail/jmap/tags.ts`).
 *
 * The source is space-general (`org.dxos.tag`), not mail-specific: the same tag identities apply to any
 * object in the space.
 *
 * TODO(wittjosiah): Factor out — these belong in a shared tag package, not plugin-inbox.
 */
export const SYSTEM_TAG_SOURCE = 'org.dxos.tag';

/** The canonical system-tag registry. Each entry's `id` is the stable foreign-key slug. */
export const SystemTag = {
  starred: { id: 'starred', label: 'Starred', hue: 'amber' },
  inbox: { id: 'inbox', label: 'Inbox', hue: 'blue' },
  important: { id: 'important', label: 'Important', hue: 'orange' },
  sent: { id: 'sent', label: 'Sent', hue: 'green' },
  personal: { id: 'personal', label: 'Personal', hue: 'neutral' },
  social: { id: 'social', label: 'Social', hue: 'cyan' },
  promotions: { id: 'promotions', label: 'Promotions', hue: 'emerald' },
  updates: { id: 'updates', label: 'Updates', hue: 'indigo' },
  forums: { id: 'forums', label: 'Forums', hue: 'purple' },
} as const;
export type SystemTagId = keyof typeof SystemTag;

/** The stable foreign key identifying a canonical system {@link Tag}. */
export const systemTagKey = (id: SystemTagId) => ({ source: SYSTEM_TAG_SOURCE, id });

/**
 * Finds-or-creates the canonical system {@link Tag}, keyed by {@link systemTagKey}. Uses the DXOS
 * label/hue (never the provider's), so a provider re-sync never renames or recolours a system tag.
 */
export const findOrCreateSystemTag = (db: Pick<Database.Database, 'query' | 'add'>, id: SystemTagId) =>
  Tag.findOrCreate(db, { key: systemTagKey(id), label: SystemTag[id].label, hue: SystemTag[id].hue });
