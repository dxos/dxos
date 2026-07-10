//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';

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

const NOT_SENT = Atom.make(() => false);

/** Per-message sent boolean atom family over a mailbox's TagIndex. */
export type SentFamily = (messageId: EntityId) => Atom.Atom<boolean>;

/**
 * Per-message sent atom family. Each atom yields whether one message carries the sent tag and
 * re-renders only when that membership changes.
 */
export const atom = (tagIndex: TagIndex.TagIndex | undefined, sentUri: string | undefined): SentFamily => {
  if (!tagIndex || !sentUri) {
    return () => NOT_SENT;
  }
  return (messageId: EntityId) => TagIndex.atom(tagIndex, messageId, sentUri);
};

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
