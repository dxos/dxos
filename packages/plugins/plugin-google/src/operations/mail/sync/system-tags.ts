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
