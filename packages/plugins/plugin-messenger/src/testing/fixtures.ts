//
// Copyright 2026 DXOS.org
//

import { type Obj, Ref } from '@dxos/echo';
import { PublicKey } from '@dxos/keys';
import { Message, SpaceInvitationMessage } from '@dxos/types';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

export type NotificationFixtures = {
  messages: Message.Message[];
  /** Messages the fixture starts out read. */
  read: Message.Message[];
};

/**
 * One of each kind of notification the tile renders differently: a plain message, one linking an
 * object, a space invitation; unread and read; within the last day and older.
 */
export const makeNotificationMessages = ({ linked }: { linked?: Obj.Unknown } = {}): NotificationFixtures => {
  const request = Message.make({
    created: minutesAgo(5).toISOString(),
    sender: { identityDid: 'did:halo:alice', name: 'Alice Example' },
    blocks: [{ _tag: 'text', text: 'Can you review the Q3 plan before Friday?' }],
    attachments: linked ? [{ name: 'Q3 planning', ref: Ref.make(linked) }] : undefined,
    properties: { subject: 'Review requested' },
  });
  const invitation = SpaceInvitationMessage.make({
    created: minutesAgo(30),
    sender: { identityDid: 'did:halo:bob', name: 'Bob Example' },
    spaceKey: PublicKey.random().toHex(),
    role: 2,
    spaceName: 'Design team',
  });
  const alert = Message.make({
    created: minutesAgo(3 * 60).toISOString(),
    sender: { identityDid: 'did:halo:ci-bot', name: 'CI bot' },
    blocks: [{ _tag: 'text', text: 'The nightly build on main failed.' }],
    properties: { subject: 'Build failed' },
  });
  const digest = Message.make({
    created: minutesAgo(3 * 24 * 60).toISOString(),
    sender: { identityDid: 'did:halo:carol', name: 'Carol Example' },
    blocks: [{ _tag: 'text', text: 'Weekly digest\nThree new documents were shared with you.' }],
  });

  return { messages: [request, invitation, alert, digest], read: [alert, digest] };
};
