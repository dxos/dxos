//
// Copyright 2026 DXOS.org
//

import { type Database, Obj, Ref, Tag } from '@dxos/echo';
import { Tagging, TagIndex } from '@dxos/schema';

/**
 * Well-known "starred" tag. The stable foreign `key` lets {@link Tag.findOrCreate} dedupe by identity
 * (not label), so every starring site across the app resolves the same tag.
 */
export const TAG_STARRED = {
  key: { source: 'org.dxos.org', id: 'starred' },
  label: 'Starred',
  hue: 'amber',
} as const;

/**
 * Object that owns a child {@link TagIndex} for tagging its immutable feed members — e.g. a Calendar's
 * Events or a Mailbox's Messages. The `tags` ref is optional to tolerate containers created before the
 * field existed (provisioned lazily by {@link toggleStarred}).
 */
export type StarContainer = { tags?: Ref.Ref<TagIndex.TagIndex> };

/** Member ids carrying the starred tag (pass the resolved starred-tag uri). */
export const getStarredIds = (container: StarContainer, starredUri: string | undefined): ReadonlySet<string> =>
  starredUri && container.tags?.target
    ? new Set(TagIndex.bind(container.tags.target).objects(starredUri))
    : new Set<string>();

/** Toggle the starred tag on a member object, provisioning the container's tag index on first use. */
export const toggleStarred = async (
  container: Obj.Any & StarContainer,
  // Member is tagged via the container's index (keyed by id), so an immutable snapshot works too.
  object: Obj.Any | Obj.Snapshot<Obj.Any>,
  db: Database.Database,
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

  const tag = await Tag.findOrCreate(db, TAG_STARRED);
  const uri = Obj.getURI(tag).toString();
  if (Tagging.get(object, { index }).includes(uri)) {
    Tagging.unset(object, uri, { index });
  } else {
    Tagging.set(object, uri, { index });
  }
};
