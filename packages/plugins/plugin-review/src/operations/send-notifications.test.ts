//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Ref } from '@dxos/echo';
import { Message, Subscription } from '@dxos/types';

import { CommentOperation } from '#types';

import { createSubscriptionHarness, preloadSubscriptionHarness } from '../testing/subscription-fixtures.ts';

await preloadSubscriptionHarness();

describe('CommentOperation.SendNotifications', () => {
  test('sends the comment to every subscriber but its author', async ({ expect }) => {
    const { harness, subject, thread, aliceDid, bobDid, sent, comment } = await createSubscriptionHarness();
    Subscription.add(subject, aliceDid);
    Subscription.add(subject, bobDid);
    const message = await comment(aliceDid, 'Should this cover JMAP too?');

    await harness.invoke(CommentOperation.SendNotifications, {
      subject: Ref.make(subject),
      thread: Ref.make(thread),
      messageId: message.id,
    });

    expect(sent.map(({ recipientDid }) => recipientDid)).toEqual([bobDid]);
    const [{ message: notification }] = sent;
    expect(notification.properties?.subject).toBe('Requirements');
    expect(Message.extractText(notification)).toBe('Should this cover JMAP too?');
    expect(notification.attachments?.map(({ ref, name }) => [ref.uri, name])).toEqual([
      [Ref.make(subject).uri, 'Requirements'],
    ]);
  });

  test('skips a subscriber who turned comments off and a DID that is not a member', async ({ expect }) => {
    const { harness, subject, thread, aliceDid, bobDid, sent, comment } = await createSubscriptionHarness();
    Subscription.set(subject, bobDid, 'comments', false);
    Subscription.add(subject, 'did:halo:former-member');
    const message = await comment(aliceDid, 'Anyone?');

    await harness.invoke(CommentOperation.SendNotifications, {
      subject: Ref.make(subject),
      thread: Ref.make(thread),
      messageId: message.id,
    });

    expect(sent).toEqual([]);
  });
});
