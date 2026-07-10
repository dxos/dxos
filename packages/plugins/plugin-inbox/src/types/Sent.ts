//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Data from 'effect/Data';

import { type Database, Obj, Tag } from '@dxos/echo';
import { type EntityId } from '@dxos/keys';
import { Tagging, TagIndex } from '@dxos/schema';

import { type Mailbox } from './Mailbox';

/**
 * Well-known "sent" tag applied to a draft once it has been sent — the provider-neutral analogue of a
 * synced message's "Sent" provider label. The stable foreign `key` lets {@link Tag.findOrCreate} dedupe
 * by identity, so every site resolves the same tag. Marking sent via a tag (rather than a plain
 * property) means the read-only switch reads it through {@link TagIndex.atom}, which reacts to the
 * mutation immediately — a property mutation would not re-fire the message's `useQuery`.
 */
export const TAG_SENT = {
  key: { source: 'org.dxos.org', id: 'sent' },
  label: 'Sent',
  hue: 'green',
} as const;

/** Key for {@link sentFamily}: the tag index, the sent-tag uri, and the message id. */
type SentKey = readonly [TagIndex.TagIndex | undefined, string | undefined, EntityId];

// Module-level family so every caller with the same (index, uri, message) shares one memoized atom.
const sentFamily = Atom.family((key: SentKey) =>
  Atom.make<boolean>((get) => {
    const [tagIndex, sentUri, messageId] = key;
    // The index or tag uri may be unresolved (mailbox loading, or no message ever sent yet).
    if (!tagIndex || !sentUri) {
      return false;
    }
    return get(TagIndex.atom(tagIndex, messageId, sentUri));
  }),
);

/**
 * Reactive boolean atom yielding whether `messageId` carries the sent tag, re-rendering only when that
 * membership changes. Memoized by the (tag index, sent-tag uri, message id) key.
 */
export const atom = (
  tagIndex: TagIndex.TagIndex | undefined,
  sentUri: string | undefined,
  messageId: EntityId,
): Atom.Atom<boolean> => sentFamily(Data.tuple(tagIndex, sentUri, messageId));

/** Applies the sent tag to a message in the mailbox's tag index. Idempotent. Returns the tag uri. */
export const markSent = async (
  mailbox: Mailbox,
  message: Obj.Any | Obj.Snapshot<Obj.Any>,
  db: Database.Database,
): Promise<string> => {
  const index = mailbox.tags.target ?? (await mailbox.tags.load());
  const tag = await Tag.findOrCreate(db, TAG_SENT);
  const uri = Obj.getURI(tag).toString();
  Tagging.set(message, uri, { index });
  return uri;
};
