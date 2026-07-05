//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type Space } from '@dxos/react-client/echo';

import { Mailbox, ThreadIndex } from '#types';

import { Builder } from './builder';

/** Fixture tag dictionary — keys are stable across runs so builder can reference them. */
export const LABELS: Record<string, { label: string }> = Object.fromEntries(
  (['important', 'investor', 'team', 'eng', 'work', 'personal'] as const).map((label) => [
    `fixture-tag-${label}`,
    { label },
  ]),
);

/**
 * Initializes a mailbox with linked messages in the given space.
 */
export const initializeMailbox = async (space: Space, count = 0): Promise<Mailbox.Mailbox> => {
  const mailbox = space.db.add(Mailbox.make());
  const feed = await mailbox.feed?.tryLoad();
  if (!feed) {
    throw new Error('Mailbox missing backing feed');
  }

  const { messages } = new Builder().createMessages(count, { links: { space }, threads: 10 }).build();
  await EffectEx.runAndForwardErrors(Feed.append(feed, messages).pipe(Effect.provide(Database.layer(space.db))));

  // Record thread membership — the fixture appends via `Feed.append`, bypassing `SyncBinding.commit`
  // where the conversation index is normally populated during live sync. One `addBatch` call (not a
  // per-message `add` loop) matches the batched write path exercised by real sync.
  const threadIndex = ThreadIndex.bind(Mailbox.getOrCreateThreadIndex(mailbox, space.db));
  threadIndex.addBatch(
    messages.flatMap((message) => (message.threadId ? [{ threadId: message.threadId, message }] : [])),
  );
  return mailbox;
};
