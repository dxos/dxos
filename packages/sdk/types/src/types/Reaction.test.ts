//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';

import * as Message from './Message';
import * as Reaction from './Reaction';

describe('Reaction', () => {
  test('make() targets a message and defaults created', ({ expect }) => {
    const message = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'hello' }] });
    const reaction = Reaction.make({ target: Ref.make(message), emoji: '👍', sender: { name: 'Me' } });
    expect(Reaction.instanceOf(reaction)).to.be.true;
    expect(reaction.target.target).to.eq(message);
    expect(reaction.emoji).to.eq('👍');
    expect(Date.parse(reaction.created)).to.be.a('number');
  });

  test('make() coerces a role sender', ({ expect }) => {
    const message = Message.make({ sender: 'user', blocks: [] });
    const reaction = Reaction.make({ target: Ref.make(message), emoji: '🎉', sender: 'user' });
    expect(reaction.sender).to.deep.eq({ role: 'user' });
  });

  test('a reaction is not a message', ({ expect }) => {
    const message = Message.make({ sender: 'user', blocks: [] });
    const reaction = Reaction.make({ target: Ref.make(message), emoji: '👍', sender: 'user' });
    expect(Obj.instanceOf(Message.Message, reaction)).to.be.false;
    expect(Reaction.instanceOf(message)).to.be.false;
  });
});
