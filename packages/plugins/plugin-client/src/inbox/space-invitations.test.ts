//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, expect, test } from 'vitest';

import { MulticastObservable } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type InboxService } from '@dxos/protocols/rpc';

import { SpaceInvitationTracker, filterSpaceInvitations, joinSpaceInvitation } from './space-invitations.ts';

const makeNotice = (senderIdentityKey: PublicKey, spaceKey: PublicKey): InboxService.Notice => ({
  id: PublicKey.random().toHex(),
  senderIdentityKey,
  spaceKey,
  role: SpaceMember_Role.EDITOR,
  sentAt: new Date(),
});

describe('filterSpaceInvitations', () => {
  const friend = PublicKey.random();
  const stranger = PublicKey.random();
  const contacts = [create(ContactSchema, { identityKey: fromPublicKey(friend) })];

  test('drops notices from senders outside the contact book', () => {
    const spaceKey = PublicKey.random();
    const invitations = filterSpaceInvitations(
      [makeNotice(friend, spaceKey), makeNotice(stranger, spaceKey)],
      contacts,
      [],
    );
    expect(invitations.map((invitation) => invitation.senderIdentityKey.toHex())).toEqual([friend.toHex()]);
    expect(invitations[0].sender).toBe(contacts[0]);
  });

  test('drops notices for spaces already joined', () => {
    const joined = PublicKey.random();
    const pending = PublicKey.random();
    const invitations = filterSpaceInvitations([makeNotice(friend, joined), makeNotice(friend, pending)], contacts, [
      PublicKey.from(joined.toHex()),
    ]);
    expect(invitations.map((invitation) => invitation.spaceKey.toHex())).toEqual([pending.toHex()]);
  });
});

describe('SpaceInvitationTracker', () => {
  const sender = PublicKey.random();
  const contact = create(ContactSchema, { identityKey: fromPublicKey(sender) });
  const invite = (spaceKey: PublicKey) => ({ ...makeNotice(sender, spaceKey), sender: contact });

  test('announces each space once, however many notices name it or how often they re-emit', () => {
    const tracker = new SpaceInvitationTracker();
    const [spaceA, spaceB] = [PublicKey.random(), PublicKey.random()];
    const first = [invite(spaceA), invite(spaceA)];
    expect(tracker.update(first).map((invitation) => invitation.spaceKey)).toEqual([spaceA]);
    expect(tracker.update(first)).toEqual([]);
    expect(tracker.update([...first, invite(spaceB)]).map((invitation) => invitation.spaceKey)).toEqual([spaceB]);
  });

  test('announces a space again once it has left the pending set', () => {
    const tracker = new SpaceInvitationTracker();
    const spaceKey = PublicKey.random();
    expect(tracker.update([invite(spaceKey)])).toHaveLength(1);
    expect(tracker.update([])).toEqual([]);
    expect(tracker.update([invite(spaceKey)])).toHaveLength(1);
  });
});

describe('joinSpaceInvitation', () => {
  const sender = PublicKey.random();
  const spaceKey = PublicKey.random();
  const other = PublicKey.random();
  const notices = [makeNotice(sender, spaceKey), makeNotice(sender, other), makeNotice(sender, spaceKey)];
  const makeInbox = () => {
    const acked: string[][] = [];
    return {
      acked,
      inbox: {
        notices: MulticastObservable.of(notices),
        ack: async (ids: readonly string[]) => {
          acked.push([...ids]);
        },
      },
    };
  };

  test('acks every notice for the space once the join succeeds', async () => {
    const { acked, inbox } = makeInbox();
    const joined = await joinSpaceInvitation({ invokePromise: async () => ({}) }, inbox, spaceKey);
    expect(joined).toBe(true);
    expect(acked).toEqual([[notices[0].id, notices[2].id]]);
  });

  test('acks nothing when the join fails', async () => {
    const { acked, inbox } = makeInbox();
    const joined = await joinSpaceInvitation(
      { invokePromise: async () => ({ error: new Error('timeout') }) },
      inbox,
      spaceKey,
    );
    expect(joined).toBe(false);
    expect(acked).toEqual([]);
  });
});
