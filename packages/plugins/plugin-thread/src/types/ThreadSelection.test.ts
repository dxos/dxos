//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Channel, Message } from '@dxos/types';

import { getThreadNodeId, isThreadSelection } from './ThreadSelection';

describe('ThreadSelection', () => {
  test('recognises a channel/threadId pair', ({ expect }) => {
    const channel = Channel.make({ name: 'general' });
    expect(isThreadSelection({ channel, threadId: '01ABC' })).to.be.true;
  });

  // The article surface is chosen by this predicate, so a bare message must not match it —
  // plugin-inbox already claims the article surface for every non-draft message.
  test('rejects a bare message and other shapes', ({ expect }) => {
    const message = Message.make({ sender: { role: 'user' }, blocks: [] });
    expect(isThreadSelection(message)).to.be.false;
    expect(isThreadSelection({ threadId: '01ABC' })).to.be.false;
    expect(isThreadSelection({ channel: Channel.make(), threadId: 7 })).to.be.false;
    expect(isThreadSelection(undefined)).to.be.false;
    expect(isThreadSelection(null)).to.be.false;
  });

  test('node ids are namespaced per channel and thread', ({ expect }) => {
    const channel = Channel.make({ name: 'general' });
    const other = Channel.make({ name: 'random' });
    expect(getThreadNodeId(channel, 'a')).to.not.eq(getThreadNodeId(channel, 'b'));
    expect(getThreadNodeId(channel, 'a')).to.not.eq(getThreadNodeId(other, 'a'));
    // Namespaced so it cannot collide with the root message's own node id.
    expect(getThreadNodeId(channel, 'a')).to.contain(Obj.getURI(channel));
    expect(getThreadNodeId(channel, 'a')).to.not.eq('a');
  });
});
