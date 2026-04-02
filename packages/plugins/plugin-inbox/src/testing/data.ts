//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Feed } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { runAndForwardErrors } from '@dxos/effect';
import { ObjectId } from '@dxos/keys';
import { type Space } from '@dxos/react-client/echo';

import { Mailbox } from '../types';

import { Builder } from './builder';

export const LABELS: Mailbox.Labels = {
  [ObjectId.random().toString()]: 'important',
  [ObjectId.random().toString()]: 'investor',
  [ObjectId.random().toString()]: 'team',
  [ObjectId.random().toString()]: 'eng',
  [ObjectId.random().toString()]: 'work',
  [ObjectId.random().toString()]: 'personal',
};

/**
 * Initializes a mailbox with linked messages in the given space.
 */
export const initializeMailbox = async (space: Space, count = 0) => {
  const mailbox = space.db.add(Mailbox.make());
  const feed = await mailbox.feed?.tryLoad();
  if (!feed) {
    throw new Error('Mailbox missing backing feed');
  }

  const { messages } = new Builder().createLinkedMessages(count, space).build();
  await runAndForwardErrors(Feed.append(feed, messages).pipe(Effect.provide(createFeedServiceLayer(space.queues))));
  return mailbox;
};
