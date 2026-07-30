//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';

import * as Message from './Message';
import * as ThreadRoot from './ThreadRoot';

describe('ThreadRoot', () => {
  test('make() targets a message and defaults created', ({ expect }) => {
    const message = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'hello' }] });
    const declaration = ThreadRoot.make({ target: Ref.make(message), creator: { name: 'Me' } });
    expect(ThreadRoot.instanceOf(declaration)).to.be.true;
    expect(declaration.target.target).to.eq(message);
    expect(declaration.name).to.be.undefined;
    expect(Date.parse(declaration.created)).to.be.a('number');
  });

  test('make() carries a name and coerces a role creator', ({ expect }) => {
    const message = Message.make({ sender: 'user', blocks: [] });
    const declaration = ThreadRoot.make({ target: Ref.make(message), creator: 'user', name: 'Q2 planning' });
    expect(declaration.creator).to.deep.eq({ role: 'user' });
    expect(declaration.name).to.eq('Q2 planning');
  });

  // The declaration marks a message; it must not be mistaken for one by a feed query.
  test('a declaration is not a message', ({ expect }) => {
    const message = Message.make({ sender: 'user', blocks: [] });
    const declaration = ThreadRoot.make({ target: Ref.make(message), creator: 'user' });
    expect(Obj.instanceOf(Message.Message, declaration)).to.be.false;
    expect(ThreadRoot.instanceOf(message)).to.be.false;
  });
});
