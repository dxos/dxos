//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test, vi } from 'vitest';

import { SpaceMember_Role } from '@dxos/client/echo';
import { Ref } from '@dxos/echo';
import { requirePublicKey } from '@dxos/protocols/buf';
import { Message, Subscription } from '@dxos/types';

import { CommentOperation } from '#types';

import { createSubscriptionHarness, preloadSubscriptionHarness } from '../testing/subscription-fixtures.ts';

const capture = vi.hoisted(() => ({ allowed: true }));
vi.mock('@dxos/observability/AiObservability', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dxos/observability/AiObservability')>()),
  contentCaptureAllowed: () => capture.allowed,
}));

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
    expect(notification.properties?.companion).toBe('~comments');
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

  test('skips a subscriber removed from the space', async ({ expect }) => {
    const { harness, space, bob, subject, thread, aliceDid, bobDid, sent, comment } = await createSubscriptionHarness();
    Subscription.add(subject, bobDid);
    await space.updateMemberRole({
      memberKey: requirePublicKey(bob.halo.identity.get()?.identityKey),
      newRole: SpaceMember_Role.REMOVED,
    });
    await expect
      .poll(() => space.members.get().find((member) => member.identity?.did === bobDid)?.role)
      .toBe(SpaceMember_Role.REMOVED);
    const message = await comment(aliceDid, 'Anyone?');

    await harness.invoke(CommentOperation.SendNotifications, {
      subject: Ref.make(subject),
      thread: Ref.make(thread),
      messageId: message.id,
    });

    expect(sent).toEqual([]);
  });

  test('carries neither title nor text when EDGE may not read the space', async ({ expect }) => {
    const { harness, subject, thread, aliceDid, bobDid, sent, comment } = await createSubscriptionHarness();
    Subscription.add(subject, bobDid);
    const message = await comment(aliceDid, 'Should this cover JMAP too?');
    capture.allowed = false;
    onTestFinished(() => {
      capture.allowed = true;
    });

    await harness.invoke(CommentOperation.SendNotifications, {
      subject: Ref.make(subject),
      thread: Ref.make(thread),
      messageId: message.id,
    });

    const [{ message: notification }] = sent;
    expect(notification.properties?.subject).toBeUndefined();
    expect(Message.extractText(notification)).toBe('New comment');
    expect(notification.attachments?.map(({ ref, name }) => [ref.uri, name])).toEqual([
      [Ref.make(subject).uri, undefined],
    ]);
  });
});
