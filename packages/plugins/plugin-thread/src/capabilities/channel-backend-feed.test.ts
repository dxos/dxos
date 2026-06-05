//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Feed, Obj } from '@dxos/echo';
import { Channel } from '@dxos/types';

import { feedChannelBackend } from './channel-backend-feed';

describe('feed channel backend', () => {
  test('declares the default feed backend kind', ({ expect }) => {
    expect(feedChannelBackend.kind).to.eq(Channel.FeedBackendKind);
  });

  test('makeConfig builds a Feed', ({ expect }) => {
    expect(Obj.instanceOf(Feed.Feed, feedChannelBackend.makeConfig({}))).to.be.true;
  });

  test('readOnly reflects foreign-key metadata', ({ expect }) => {
    const local = Channel.make({ name: 'local' });
    expect(feedChannelBackend.readOnly?.(local)).to.be.false;

    const foreign = Channel.make({ [Obj.Meta]: { keys: [{ source: 'test.source', id: 'abc' }] }, name: 'foreign' });
    expect(feedChannelBackend.readOnly?.(foreign)).to.be.true;
  });

  test('subscribe on an un-stored channel yields an empty list and a no-op unsubscribe', ({ expect }) => {
    const channel = Channel.make({ name: 'orphan' });
    let observed: readonly unknown[] | undefined;
    const unsubscribe = feedChannelBackend.subscribe(channel, (messages) => {
      observed = messages;
    });
    expect(observed).to.deep.eq([]);
    expect(() => unsubscribe()).to.not.throw();
  });
});
