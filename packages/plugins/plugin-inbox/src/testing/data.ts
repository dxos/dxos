//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type Space } from '@dxos/react-client/echo';

import { Mailbox } from '#types';

import { Builder } from './builder';

/** Fixture tag dictionary — keys are stable across runs so builder can reference them. */
export const LABELS: Record<string, { label: string }> = Object.fromEntries(
  (['important', 'investor', 'team', 'eng', 'work', 'personal'] as const).map((label) => [
    `fixture-tag-${label}`,
    { label },
  ]),
);

/**
 * Initializes a mailbox with linked messages in the given space. `threads` is the size of the
 * thread-id pool messages are randomly assigned to (fewer threads → larger conversations → fewer
 * grouped tiles in conversation view).
 */
export const initializeMailbox = async (space: Space, count = 0, threads = 10): Promise<Mailbox.Mailbox> => {
  const mailbox = space.db.add(Mailbox.make());
  const feed = await mailbox.feed?.tryLoad();
  if (!feed) {
    throw new Error('Mailbox missing backing feed');
  }

  const { messages } = new Builder().createMessages(count, { links: { space }, threads }).build();
  await EffectEx.runAndForwardErrors(Feed.append(feed, messages).pipe(Effect.provide(Database.layer(space.db))));
  return mailbox;
};
