//
// Copyright 2026 DXOS.org
//

import type * as SystemTags from '@dxos/plugin-inbox/SystemTags';

/**
 * Gmail system label id → canonical system tag ({@link SystemTags.SystemTag}). A system label absent
 * here is intentionally dropped (read-state `UNREAD`; `DRAFT`; `TRASH` — deletion is not a tag; there
 * is no archive label, so archive is derived as "not in inbox"), never turned into a provider tag.
 *
 * `SPAM` is mapped in both directions: `ClassifyMailbox` applies the canonical `spam` tag locally, and
 * tag sync pushes it, so Gmail's own spam verdict and ours must resolve to the same tag rather than
 * two parallel notions of junk. `users.messages.modify` accepts `SPAM` in `addLabelIds` like any other
 * label (verified live), so it needs no special handling — unlike `TRASH`, which `modify` refuses.
 */
export const GMAIL_SYSTEM_TAGS: Partial<Record<string, SystemTags.SystemTagId>> = {
  STARRED: 'starred',
  INBOX: 'inbox',
  IMPORTANT: 'important',
  SENT: 'sent',
  CATEGORY_PERSONAL: 'personal',
  CATEGORY_SOCIAL: 'social',
  CATEGORY_PROMOTIONS: 'promotions',
  CATEGORY_UPDATES: 'updates',
  CATEGORY_FORUMS: 'forums',
  SPAM: 'spam',
};

/**
 * Labels Gmail maps inbound but refuses to accept in a `users.messages.modify` write — verified live
 * (2026-08-15): `addLabelIds: ['SENT']` answers `400 Invalid label: SENT`. Membership is derived by
 * Gmail from the message itself, not set by clients.
 *
 * They are excluded from the push side (`tagBindings`) while staying in {@link GMAIL_SYSTEM_TAGS} for
 * the pull, because a pushable-but-rejected tag is worse than an unpushable one: the send flow applies
 * the canonical `sent` tag locally on every send, so every sent message would produce a permanent 400
 * that settles, advances the base, and logs a warning — a per-message error for a change that could
 * never have been applied.
 *
 * `CATEGORY_*` was suspected of the same problem and is NOT affected: all five accept a `modify` write
 * (verified in the same pass), as do `STARRED`, `IMPORTANT`, `UNREAD` and `SPAM`.
 */
export const GMAIL_UNPUSHABLE_LABELS: ReadonlySet<string> = new Set(['SENT', 'DRAFT', 'TRASH']);
