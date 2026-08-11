//
// Copyright 2026 DXOS.org
//

import { type Database, Tag } from '@dxos/echo';

/**
 * Gmail's tag origin domain (see `Tag.md` §"Tag origin"). A Gmail label maps to a {@link Tag} object
 * carrying `{ source: GMAIL_TAG_SOURCE, id: <gmail-label-id> }`, which both identifies the label for
 * re-sync and marks the tag read-only in the app (`Tag.isProviderTag`). Used by `sync/` to materialize
 * custom user labels; Gmail's *system* labels map onto canonical {@link SystemTags.SystemTag}s instead.
 *
 * The domain carries no resource segment: the key sits on a `Tag`, so the object's own type already
 * says "label" — `com.google.gmail.label` said it twice.
 */
export const GMAIL_TAG_SOURCE = 'com.google.gmail';

/**
 * The pre-rename source, matched as a fallback so tags synced before the rename keep their identity
 * (and every message pointing at them) instead of being duplicated. Remove one release after landing.
 */
const LEGACY_GMAIL_TAG_SOURCE = 'com.google.gmail.label';

/**
 * Finds an existing Gmail provider {@link Tag} object by its Gmail label-id foreign key, or creates
 * one carrying that key. Keeps the label in sync with Gmail's dictionary on re-sync.
 */
export const findOrCreateGmailTag = (
  db: Database.Database,
  { id, name }: { id: string; name: string },
): Promise<Tag.Tag> =>
  Tag.findOrCreate(db, {
    key: { source: GMAIL_TAG_SOURCE, id },
    legacyKeys: [{ source: LEGACY_GMAIL_TAG_SOURCE, id }],
    label: name,
  });
