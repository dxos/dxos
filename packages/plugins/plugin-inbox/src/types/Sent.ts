//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Data from 'effect/Data';

import { type Database, Filter, Obj, Tag } from '@dxos/echo';
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

/** Key for {@link sentFamily}: the mailbox whose tag index is read, and the message id. */
type SentKey = readonly [Mailbox | undefined, EntityId];

// Module-level family so every caller sharing a (mailbox, message) shares one memoized atom. It owns
// the whole read: resolving the mailbox's tag index and the sent tag's uri from the space's tag
// registry, so callers ask only "is this message sent?" and never touch the tag-index API.
const sentFamily = Atom.family((key: SentKey) =>
  Atom.make<boolean>((get) => {
    const [mailbox, messageId] = key;
    if (!mailbox) {
      return false;
    }
    const db = Obj.getDatabase(mailbox);
    const tagIndex = get(mailbox.tags.atom);
    if (!db || !tagIndex) {
      return false;
    }
    // The sent tag is created lazily on the first send in the space; until it exists, nothing is sent.
    const sentTag = get(db.query(Filter.foreignKeys(Tag.Tag, [TAG_SENT.key])).atom)[0];
    if (!sentTag) {
      return false;
    }
    return get(TagIndex.atom(tagIndex, messageId, Obj.getURI(sentTag).toString()));
  }),
);

/**
 * Reactive boolean atom yielding whether `messageId` carries the sent tag in the mailbox's tag index,
 * re-rendering only when that membership changes. Memoized by the (mailbox, message id) key.
 */
export const atom = (mailbox: Mailbox | undefined, messageId: EntityId): Atom.Atom<boolean> =>
  sentFamily(Data.tuple(mailbox, messageId));

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
