//
// Copyright 2026 DXOS.org
//

import { create, toBinary } from '@bufbuild/protobuf';
import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { fromDate, fromPublicKey } from '@dxos/protocols/buf';
import { InboxEnvelopeHeaderSchema, InboxEnvelopeSchema } from '@dxos/protocols/buf/dxos/halo/inbox_pb';
import { Message, SpaceInvitationMessage } from '@dxos/types';

import { describePushMessage, parsePushMessage, readEnvelope } from './notification.ts';

const sender = PublicKey.random();
const recipient = PublicKey.random();

/** An envelope as the client encodes one (`createInboxEnvelope`), with a dummy signature: nothing here verifies it. */
const encodeEnvelope = (payload: string, type = 'org.dxos.inbox.message', version = 1) => {
  const header = toBinary(
    InboxEnvelopeHeaderSchema,
    create(InboxEnvelopeHeaderSchema, {
      version,
      type,
      sender: fromPublicKey(sender),
      recipient: fromPublicKey(recipient),
      sentAt: fromDate(new Date()),
      payload,
    }),
  );
  const envelope = create(InboxEnvelopeSchema, {
    version,
    header,
    signer: fromPublicKey(sender),
    signature: new Uint8Array(64).fill(7),
  });
  return Buffer.from(toBinary(InboxEnvelopeSchema, envelope)).toString('base64');
};

const pushMessage = (payload?: string) => ({
  v: 1 as const,
  id: crypto.randomUUID(),
  senderDid: 'did:halo:B',
  sentAt: 1,
  payload,
});

const spaceKey = PublicKey.random().toHex();

describe('readEnvelope', () => {
  test('reads the type and payload from a real envelope', () => {
    expect(readEnvelope(encodeEnvelope('{"a":1}'))).toEqual({ type: 'org.dxos.inbox.message', payload: '{"a":1}' });
  });

  test('refuses anything that is not an envelope', () => {
    expect(readEnvelope('not base64!')).toBeUndefined();
    expect(readEnvelope(Buffer.from([0xff, 0xff, 0xff]).toString('base64'))).toBeUndefined();
    expect(readEnvelope(encodeEnvelope('{}', 'org.dxos.inbox.message', 0))).toBeUndefined();
  });
});

describe('describePushMessage', () => {
  test('a space invitation names the space and the sender and deep-links to joining it', () => {
    const invitation = SpaceInvitationMessage.make({
      sender: { name: 'Alice' },
      spaceKey,
      role: 2,
      spaceName: 'Design review',
    });

    expect(describePushMessage(pushMessage(encodeEnvelope(Message.encodeJson(invitation))))).toEqual({
      title: 'Invitation to Design review',
      body: 'Alice invited you to join.',
      tag: `space-invitation:${spaceKey}`,
      url: `/?spaceKey=${spaceKey}`,
    });
  });

  test('an invitation without a space name or sender name still reads well', () => {
    const invitation = SpaceInvitationMessage.make({ sender: {}, spaceKey, role: 2 });
    const notification = describePushMessage(pushMessage(encodeEnvelope(Message.encodeJson(invitation))));
    expect(notification.title).toBe('Space invitation');
    expect(notification.body).toBe('A contact invited you to join.');
  });

  test('sender-written names are cleaned and capped', () => {
    const invitation = SpaceInvitationMessage.make({
      sender: { name: 'Mallory\u0000\u0007' },
      spaceKey,
      role: 2,
      spaceName: 'x'.repeat(200),
    });
    const notification = describePushMessage(pushMessage(encodeEnvelope(Message.encodeJson(invitation))));
    expect(notification.title.length).toBeLessThanOrEqual('Invitation to '.length + 60);
    expect(notification.body).toBe('Mallory invited you to join.');
  });

  test('another message shows its sender and text', () => {
    const message = Message.make({ sender: { name: 'Bob' }, blocks: [{ _tag: 'text', text: 'Lunch?' }] });
    const notification = describePushMessage(pushMessage(encodeEnvelope(Message.encodeJson(message))));
    expect(notification).toMatchObject({ title: 'Bob', body: 'Lunch?', url: '/' });
  });

  test('a push without a readable payload falls back to generic text', () => {
    expect(describePushMessage(pushMessage())).toMatchObject({ title: 'Composer', url: '/' });
    expect(describePushMessage(pushMessage(encodeEnvelope('not json')))).toMatchObject({ title: 'Composer' });
    expect(describePushMessage(pushMessage(encodeEnvelope('{}', 'org.example.other')))).toMatchObject({
      title: 'Composer',
    });
  });

  test('a test push shows what notifications look like', () => {
    expect(describePushMessage({ ...pushMessage(), test: true })).toMatchObject({
      title: 'Notifications are on',
      body: 'This is how Composer will tell you about invitations and messages.',
    });
  });
});

describe('parsePushMessage', () => {
  test('accepts a version 1 message and refuses anything else', () => {
    expect(parsePushMessage({ v: 1, id: 'a', senderDid: 'b', sentAt: 2, payload: 'c' })).toEqual({
      v: 1,
      id: 'a',
      senderDid: 'b',
      sentAt: 2,
      payload: 'c',
      test: undefined,
    });
    expect(parsePushMessage({ v: 2, id: 'a', senderDid: 'b' })).toBeUndefined();
    expect(parsePushMessage('text')).toBeUndefined();
  });
});
