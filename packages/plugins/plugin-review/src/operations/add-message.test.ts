//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { Subscription } from '@dxos/types';

import { CommentOperation } from '#types';

import { createSubscriptionHarness, preloadSubscriptionHarness } from '../testing/subscription-fixtures.ts';

await preloadSubscriptionHarness();

describe('CommentOperation.AddMessage', () => {
  test("subscribes the commenter and notifies the object's other subscribers", async ({ expect }) => {
    const { harness, subject, anchor, aliceDid, bobDid, sent } = await createSubscriptionHarness();
    Subscription.add(subject, bobDid);

    await harness.invoke(CommentOperation.AddMessage, {
      subject,
      anchor,
      sender: { identityDid: aliceDid },
      text: 'Ready for review',
    });

    expect(Subscription.getSubscribers(subject, 'comments').toSorted()).toEqual([aliceDid, bobDid].toSorted());
    await vi.waitFor(() => expect(sent.map(({ recipientDid }) => recipientDid)).toEqual([bobDid]));
  });

  test('leaves an unsubscribed commenter unsubscribed', async ({ expect }) => {
    const { harness, subject, anchor, aliceDid } = await createSubscriptionHarness();
    Subscription.set(subject, aliceDid, 'comments', false);

    await harness.invoke(CommentOperation.AddMessage, {
      subject,
      anchor,
      sender: { identityDid: aliceDid },
      text: 'One more thing',
    });

    expect(Subscription.getSubscribers(subject, 'comments')).toEqual([]);
  });
});
