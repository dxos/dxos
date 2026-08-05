//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';

import * as Message from './Message';

describe('Message', () => {
  test('make() defaults created and coerces a role sender', ({ expect }) => {
    const message = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'hello' }] });
    expect(message.sender).to.deep.eq({ role: 'user' });
    expect(Date.parse(message.created)).to.be.a('number');
  });

  // `parentMessage` is a self-reference, so its schema is wrapped in `Schema.suspend` — exercise it
  // to catch a suspend that never resolves.
  test('parentMessage references another message', ({ expect }) => {
    const root = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'root' }] });
    const reply = Message.make({
      sender: 'user',
      blocks: [{ _tag: 'text', text: 'reply' }],
      parentMessage: Ref.make(root),
    });
    expect(reply.parentMessage?.target).to.eq(root);
    expect(Obj.instanceOf(Message.Message, reply.parentMessage?.target)).to.be.true;
  });

  test('extractText() joins text blocks', ({ expect }) => {
    const message = Message.make({
      sender: 'user',
      blocks: [
        { _tag: 'text', text: 'one' },
        { _tag: 'toolCall', toolCallId: 'x', name: 'y', input: '{}', providerExecuted: false },
        { _tag: 'text', text: 'two' },
      ],
    });
    expect(Message.extractText(message)).to.eq('one\ntwo');
  });
});
