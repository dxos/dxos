//
// Copyright 2026 DXOS.org
//

import { type Database, Tag } from '@dxos/echo';

/**
 * Foreign-key source for Gmail provider labels. A Gmail label maps to a {@link Tag} object carrying
 * a foreign key `{ source: GMAIL_TAG_SOURCE, id: <gmail-label-id> }`; "provider" tags are those with
 * such a key, "user" tags are those without. Shared by both `sync/` (label→tag materialization) and
 * `send/` (tagging a local draft with the same tag its sent copy will carry).
 */
export const GMAIL_TAG_SOURCE = 'com.google.gmail.label';

/**
 * Finds an existing Gmail provider {@link Tag} object by its Gmail label-id foreign key, or creates
 * one carrying that key. Keeps the label in sync with Gmail's dictionary on re-sync.
 */
export const findOrCreateGmailTag = (
  db: Database.Database,
  { id, name }: { id: string; name: string },
): Promise<Tag.Tag> => Tag.findOrCreate(db, { key: { source: GMAIL_TAG_SOURCE, id }, label: name });
