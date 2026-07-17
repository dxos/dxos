//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';

import { type Database, Obj, Ref, Tag } from '@dxos/echo';
import { type EntityId } from '@dxos/keys';
import { Tagging, TagIndex } from '@dxos/schema';

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

//
// Generic tag-membership helpers over a container's TagIndex (e.g. a Mailbox's Messages, a Calendar's
// Events). Each is generic over *any* tag uri, so callers pass a {@link SystemTagId} (via
// {@link findOrCreateSystemTag}) or a user tag's uri interchangeably.
//

/**
 * Object that owns a child {@link TagIndex} for tagging its immutable feed members. The `tags` ref is
 * optional to tolerate containers created before the field existed (provisioned lazily by
 * {@link toggleTag}).
 */
export type TagContainer = { tags?: Ref.Ref<TagIndex.TagIndex> };

/** Member ids carrying the given tag (pass the resolved tag uri). */
export const getTaggedIds = (container: TagContainer, tagUri: string | undefined): ReadonlySet<string> =>
  tagUri && container.tags?.target ? new Set(TagIndex.bind(container.tags.target).objects(tagUri)) : new Set<string>();

const NOT_TAGGED = Atom.make(() => false);

/** Per-member tag-membership boolean atom family over a container's TagIndex. */
export type TaggedFamily = (memberId: EntityId) => Atom.Atom<boolean>;

/**
 * Per-member tag-membership atom family. Each atom yields whether one object carries the given tag and
 * re-renders only when that membership changes.
 */
export const tagAtom = (tagIndex: TagIndex.TagIndex | undefined, tagUri: string | undefined): TaggedFamily => {
  if (!tagIndex || !tagUri) {
    return () => NOT_TAGGED;
  }
  return (memberId: EntityId) => TagIndex.atom(tagIndex, memberId, tagUri);
};

/** Toggles a canonical system tag on a member object, provisioning the container's tag index on first use. */
export const toggleTag = async (
  container: Obj.Any & TagContainer,
  // Member is tagged via the container's index (keyed by id), so an immutable snapshot works too.
  object: Obj.Any | Obj.Snapshot<Obj.Any>,
  db: Database.Database,
  tagId: SystemTagId,
): Promise<void> => {
  // Lazily provision the tag index for containers created before the `tags` field existed.
  let index = container.tags?.target;
  if (!index) {
    index = db.add(TagIndex.make());
    Obj.setParent(index, container);
    Obj.update(container, (container) => {
      container.tags = Ref.make(index!);
    });
  }

  const tag = await findOrCreateSystemTag(db, tagId);
  const uri = Obj.getURI(tag).toString();
  if (Tagging.get(object, { index }).includes(uri)) {
    Tagging.unset(object, uri, { index });
  } else {
    Tagging.set(object, uri, { index });
  }
};
