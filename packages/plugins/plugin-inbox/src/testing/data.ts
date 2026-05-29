//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Feed } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { runAndForwardErrors } from '@dxos/effect';
import { type Space } from '@dxos/react-client/echo';

import { Mailbox } from '#types';

import { Builder } from './builder';

/** Fixture tag dictionary — keys are stable across runs so builder can reference them. */
export const LABELS: Mailbox.Tags = Object.fromEntries(
  (['important', 'investor', 'team', 'eng', 'work', 'personal'] as const).map((label) => [
    `fixture-tag-${label}`,
    { label, source: 'user', messages: [] },
  ]),
);

/**
 * Initializes a mailbox with linked messages in the given space.
 */
export const initializeMailbox = async (space: Space, count = 0) => {
  const mailbox = space.db.add(Mailbox.make());
  const feed = await mailbox.feed?.tryLoad();
  if (!feed) {
    throw new Error('Mailbox missing backing feed');
  }

  const { messages } = new Builder().createMessages(count, { links: { space }, threads: 10 }).build();
  await runAndForwardErrors(Feed.append(feed, messages).pipe(Effect.provide(createFeedServiceLayer(space.queues))));
  return mailbox;
};
