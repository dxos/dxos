//
// Copyright 2026 DXOS.org
//

import { type SystemTags } from '../../../../types';

/**
 * Gmail system label id → canonical system tag ({@link SystemTags.SystemTag}). A system label absent
 * here is intentionally dropped (read-state `UNREAD`; `DRAFT`; `TRASH`/`SPAM` — never synced; there is
 * no archive label, so archive is derived as "not in inbox"), never turned into a provider tag.
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
};
