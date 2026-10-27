//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import * as Message from './Message.ts';
import * as SpaceInvitationMessage from './SpaceInvitationMessage.ts';

describe('SpaceInvitationMessage', () => {
  test('make() and match() round-trip through the JSON payload', ({ expect }) => {
    const message = SpaceInvitationMessage.make({
      sender: { identityDid: 'did:halo:sender' },
      spaceKey: 'abcd',
      role: 2,
      spaceName: 'Plans',
    });
    expect(Message.extractText(message)).toContain('Plans');

    const decoded = Message.decodeJson(Message.encodeJson(message));
    expect(Option.isSome(decoded)).toBe(true);
    const data = Option.getOrThrow(decoded);
    expect(data).not.toHaveProperty('id');
    expect(data.sender.identityDid).toBe('did:halo:sender');
    expect(Option.getOrThrow(SpaceInvitationMessage.match(data))).toEqual({
      spaceKey: 'abcd',
      role: 2,
      spaceName: 'Plans',
    });
  });

  test('match() ignores other messages', ({ expect }) => {
    const message = Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: 'hi' }] });
    expect(Option.isNone(SpaceInvitationMessage.match(message))).toBe(true);
  });

  test('decodeJson() rejects payloads that are not messages', ({ expect }) => {
    expect(Option.isNone(Message.decodeJson('not json'))).toBe(true);
    expect(Option.isNone(Message.decodeJson('{"blocks":[]}'))).toBe(true);
  });
});
