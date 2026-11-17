//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Ref } from '@dxos/echo';
import { Thread } from '@dxos/types';

import { CommentOperation } from '#types';

import { CommentNotPersistedError } from '../errors.ts';
import { createSubscriptionHarness, preloadSubscriptionHarness } from '../testing/subscription-fixtures.ts';
import { FAILED_TEXT } from '../util/pending.ts';

await preloadSubscriptionHarness();

/** Answers a comment with a runner that settles as `run` does; returns the thread's [sender, text] pairs. */
const respond = async (run: Effect.Effect<string | undefined, Error>) => {
  const { harness, subject, thread, aliceDid, comment } = await createSubscriptionHarness({
    agentRunner: { run: () => run },
    agentIdentity: { name: 'Kai' },
  });
  const message = await comment(aliceDid, '@Kai when is this due?');
  await harness.invoke(CommentOperation.RespondToThread, {
    thread: Ref.make(thread),
    subject: Ref.make(subject),
    messageId: message.id,
  });
  const messages = await Thread.loadMessages(thread);
  return messages.map(({ sender, blocks }) => [
    `${sender.role}${sender.name ? ` (${sender.name})` : ''}`,
    blocks.map((block) => (block._tag === 'text' ? block.text : block._tag)).join(),
  ]);
};

describe('CommentOperation.RespondToThread', () => {
  test("posts the turn's reply in the agent's name in place of the pending message", async ({ expect }) => {
    expect(await respond(Effect.succeed('Due Friday.'))).toEqual([
      ['user', '@Kai when is this due?'],
      ['assistant (Kai)', 'Due Friday.'],
    ]);
  });

  test('posts nothing for a turn without a reply', async ({ expect }) => {
    expect(await respond(Effect.succeed(undefined))).toEqual([['user', '@Kai when is this due?']]);
  });

  test('says the turn failed when the run fails', async ({ expect }) => {
    expect(await respond(Effect.fail(new CommentNotPersistedError()))).toEqual([
      ['user', '@Kai when is this due?'],
      ['assistant (Kai)', FAILED_TEXT],
    ]);
  });
});
