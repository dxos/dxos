//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

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

  // The graph builder qualifies a node id with its parent's path and rejects any id containing the
  // separator, so a thread id must stay a single segment — uniqueness across channels comes from the
  // channel's path, not from this id.
  test('node ids are single path segments, distinct per thread', ({ expect }) => {
    expect(getThreadNodeId('a')).to.not.eq(getThreadNodeId('b'));
    expect(getThreadNodeId('a')).to.not.contain('/');
    // Prefixed so it cannot collide with the root message's own node id.
    expect(getThreadNodeId('a')).to.not.eq('a');
  });
});
