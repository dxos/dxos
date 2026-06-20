//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Feed, Obj } from '@dxos/echo';

import * as Channel from './Channel';

describe('Channel', () => {
  test('make() defaults to the feed backend with a Feed config', ({ expect }) => {
    const channel = Channel.make({ name: 'general' });
    expect(channel.name).to.eq('general');
    expect(channel.backend.kind).to.eq(Channel.FeedBackendKind);
    const config = channel.backend.config.target;
    expect(Obj.instanceOf(Feed.Feed, config)).to.be.true;
  });

  test('getFeed() returns the feed config for a feed-backed channel', ({ expect }) => {
    const channel = Channel.make({ name: 'general' });
    expect(Obj.instanceOf(Feed.Feed, Channel.getFeed(channel))).to.be.true;
  });

  test('make() accepts an explicit backend', ({ expect }) => {
    const feed = Feed.make();
    const channel = Channel.make({ name: 'x', backend: { kind: 'org.dxos.channel.backend.test', config: feed } });
    expect(channel.backend.kind).to.eq('org.dxos.channel.backend.test');
    expect(channel.backend.config.target).to.eq(feed);
  });
});
