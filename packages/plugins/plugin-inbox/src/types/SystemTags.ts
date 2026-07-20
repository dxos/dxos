//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Database, Obj, Ref, Tag } from '@dxos/echo';
import { type EntityId } from '@dxos/keys';
import { Tagging, TagIndex } from '@dxos/schema';

/**
 * Canonical, provider-agnostic system tags. Each provider maps its own vocabulary onto these (Gmail
 * labels, JMAP mailbox roles + keywords), so a Gmail star, a JMAP `$flagged` keyword, and a
 * locally-toggled star resolve to the *same* {@link Tag} object (likewise inbox/sent/etc.). Custom user
 * labels/folders keep their own provider-scoped tags (`findOrCreateGmailTag`/`findOrCreateJmapTag`).
 *
 * `draft` is the one entry with no provider mapping: applied/removed locally at compose/send time
 * (`DraftEmailAndOpen`, `useSendEmail`), never synced from a provider's own draft signal.
 *
 * The source is space-general (`org.dxos.tag`), not mail-specific, so the same tag identities apply to
 * any object in the space.
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
  draft: { id: 'draft', label: 'Draft', hue: 'yellow' },
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

/**
 * Toggles a canonical system tag on a member object, provisioning the container's tag index on first
 * use. Depends on `Database.Service` for `db` — run within a layer that provides it, or
 * `.pipe(Effect.provide(Database.layer(db)))` from a plain `Database.Database`.
 */
export const toggleTag = Effect.fn('SystemTags.toggleTag')(function* (
  container: Obj.Any & TagContainer,
  // Member is tagged via the container's index (keyed by id), so an immutable snapshot works too.
  object: Obj.Any | Obj.Snapshot<Obj.Any>,
  tagId: SystemTagId,
) {
  const { db } = yield* Database.Service;

  // Lazily provision the tag index for containers created before the `tags` field existed.
  let index = container.tags?.target;
  if (!index) {
    index = db.add(TagIndex.make());
    Obj.setParent(index, container);
    Obj.update(container, (container) => {
      container.tags = Ref.make(index!);
    });
  }

  const tag = yield* Effect.promise(() => findOrCreateSystemTag(db, tagId));
  const uri = Obj.getURI(tag).toString();
  if (Tagging.get(object, { index }).includes(uri)) {
    Tagging.unset(object, uri, { index });
  } else {
    Tagging.set(object, uri, { index });
  }
});
