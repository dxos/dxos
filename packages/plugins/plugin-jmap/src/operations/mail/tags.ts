//
// Copyright 2026 DXOS.org
//

import { type Database, Tag } from '@dxos/echo';

import { JMAP_DOMAIN } from '../../constants.ts';

/**
 * The pre-rename source, matched as a fallback so folders synced before the rename keep their tag
 * identity instead of being duplicated. Remove one release after landing.
 */
const LEGACY_JMAP_TAG_SOURCE = 'org.ietf.jmap.mailbox';

/**
 * Finds an existing JMAP provider {@link Tag} object by its JMAP mailbox-id foreign key, or creates one
 * carrying that key ({@link JMAP_DOMAIN}, which also marks it read-only via `Tag.isProviderTag`). Keeps
 * the folder label in sync with the server on re-sync. Used by `sync/` for custom user folders;
 * well-known roles map onto canonical system tags instead. Mirrors Gmail's `findOrCreateGmailTag`.
 */
export const findOrCreateJmapTag = (
  db: Database.Database,
  { id, name }: { id: string; name: string },
): Promise<Tag.Tag> =>
  Tag.findOrCreate(db, {
    key: { source: JMAP_DOMAIN, id },
    legacyKeys: [{ source: LEGACY_JMAP_TAG_SOURCE, id }],
    label: name,
  });
