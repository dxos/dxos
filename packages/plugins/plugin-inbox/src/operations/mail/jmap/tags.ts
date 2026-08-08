//
// Copyright 2026 DXOS.org
//

import { type Database, Tag } from '@dxos/echo';

/**
 * Foreign-key source for JMAP provider folders (mailboxes). A JMAP mailbox maps to a {@link Tag} object
 * carrying a foreign key `{ source: JMAP_TAG_SOURCE, id: <jmap-mailbox-id> }`; mirrors Gmail's
 * `GMAIL_TAG_SOURCE`. Used by `sync/` to materialize custom user folders as tags (well-known roles map
 * onto canonical {@link SystemTags.SystemTag}s instead).
 */
export const JMAP_TAG_SOURCE = 'org.ietf.jmap';

/**
 * The pre-rename source, matched as a fallback so folders synced before the rename keep their tag
 * identity instead of being duplicated. Remove one release after landing.
 */
const LEGACY_JMAP_TAG_SOURCE = 'org.ietf.jmap.mailbox';

/**
 * Finds an existing JMAP provider {@link Tag} object by its JMAP mailbox-id foreign key, or creates
 * one carrying that key. Keeps the folder label in sync with the server on re-sync. Mirrors Gmail's
 * `findOrCreateGmailTag`.
 */
export const findOrCreateJmapTag = (
  db: Database.Database,
  { id, name }: { id: string; name: string },
): Promise<Tag.Tag> =>
  Tag.findOrCreate(db, {
    key: { source: JMAP_TAG_SOURCE, id },
    legacyKeys: [{ source: LEGACY_JMAP_TAG_SOURCE, id }],
    label: name,
  });
