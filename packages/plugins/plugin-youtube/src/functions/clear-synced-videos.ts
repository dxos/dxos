//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import * as Channel from '../types/Channel';
import * as Video from '../types/Video';

import { ClearSyncedVideos } from './definitions';

export default ClearSyncedVideos.pipe(
  Operation.withHandler(({ channel: channelRef }) =>
    Effect.gen(function* () {
      log('clearing youtube channel synced videos', { channel: channelRef.dxn.toString() });
      const channel = (yield* Database.load(channelRef)) as Channel.YouTubeChannel;
      const oldFeed = yield* Database.load(channel.feed as Ref.Ref<Feed.Feed>);

      const videos = yield* Feed.runQuery(oldFeed, Filter.type(Video.YouTubeVideo));
      log('removing synced videos', { count: videos.length });

      const newFeed = Feed.make();
      yield* Database.add(newFeed);
      Obj.setParent(newFeed, channel);

      Obj.change(channel, (mutable) => {
        mutable.feed = Ref.make(newFeed);
        delete mutable.lastSyncedAt;
      });

      if (videos.length > 0) {
        yield* Feed.remove(oldFeed, videos);
      }

      for (const video of videos) {
        yield* Database.remove(video);
      }

      yield* Database.remove(oldFeed);

      log('replaced youtube channel feed', { removedVideos: videos.length });
      return { removedVideos: videos.length };
    }),
  ),
);
