//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Database, Feed } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';
import { Subscription } from '../types';

const FEED_OPERATION = `${meta.id}.operation`;

/** Fetches an RSS/Atom feed and appends new posts to the backing ECHO feed. */
export const SyncFeed = Operation.make({
  meta: {
    key: `${FEED_OPERATION}.sync-feed`,
    name: 'Sync Feed',
    description: 'Fetches RSS/Atom feed and writes posts to the ECHO feed.',
  },
  services: [Capability.Service, Database.Service, Feed.Service],
  input: Schema.Struct({
    feed: Subscription.Feed,
  }),
  output: Schema.Void,
});
