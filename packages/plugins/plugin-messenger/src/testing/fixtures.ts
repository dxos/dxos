//
// Copyright 2026 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { Message, SpaceInvitationMessage } from '@dxos/types';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

/** A representative feed: a contact's request, a space invitation and a bot alert. */
export const makeNotificationMessages = (): Message.Message[] => [
  Message.make({
    created: minutesAgo(5).toISOString(),
    sender: { identityDid: 'did:halo:alice', name: 'Alice Example' },
    blocks: [{ _tag: 'text', text: 'Can you review the Q3 plan before Friday?' }],
    properties: { subject: 'Review requested' },
  }),
  SpaceInvitationMessage.make({
    created: minutesAgo(30),
    sender: { identityDid: 'did:halo:bob', name: 'Bob Example' },
    spaceKey: PublicKey.random().toHex(),
    role: 2,
    spaceName: 'Design team',
  }),
  Message.make({
    created: minutesAgo(120).toISOString(),
    sender: { identityDid: 'did:halo:ci-bot', name: 'CI bot' },
    blocks: [{ _tag: 'text', text: 'The nightly build on main failed.' }],
    properties: { subject: 'Build failed' },
  }),
];
