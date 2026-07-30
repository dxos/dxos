//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { getThreadId, getThreadNodeId } from './ThreadSelection';

describe('ThreadSelection', () => {
  // The channel article and a thread's article both take a channel as their subject and are told
  // apart by this property alone, so anything that is not a thread id has to read as absent.
  test('reads the thread id off node properties', ({ expect }) => {
    expect(getThreadId({ threadId: '01ABC' })).to.eq('01ABC');
    expect(getThreadId({ threadId: 7 })).to.be.undefined;
    expect(getThreadId({})).to.be.undefined;
    expect(getThreadId()).to.be.undefined;
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
