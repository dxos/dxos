//
// Copyright 2023 DXOS.org
//

import { importSpace, type ImportSpaceOptions } from '@dxos/client/echo';
import { Feed, Obj } from '@dxos/echo';
import { Filter, type SerializedFeed, type SerializedSpace, Serializer } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';

export const exportData = async (space: Space): Promise<Blob> => {
  const backup = await new Serializer().export(space.internal.db);

  const feeds = await exportFeedData(space);
  if (feeds.length > 0) {
    backup.feeds = feeds;
  }

  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
};

export const importData = async (space: Space, backup: Blob, options?: ImportSpaceOptions) => {
  try {
    const backupString = await backup.text();
    const data = JSON.parse(backupString) as SerializedSpace;

    await importSpace(space.internal.db, data, options);

    if (data.feeds?.length) {
      await importFeedData(space, data.feeds);
    }
  } catch (err) {
    log.catch(err);
  }
};

/**
 * Export feed/queue messages for all Feed objects in the space.
 */
const exportFeedData = async (space: Space): Promise<SerializedFeed[]> => {
  const feedObjects = await space.internal.db.query(Filter.type(Feed.Feed)).run();
  const feeds: SerializedFeed[] = [];

  for (const feedObj of feedObjects) {
    const queueDxn = Feed.getQueueDxn(feedObj);
    if (!queueDxn) {
      continue;
    }

    try {
      const queue = space.queues.get(queueDxn);
      const messages = await queue.queryObjects();
      if (messages.length > 0) {
        feeds.push({
          feedObjectId: feedObj.id,
          namespace: feedObj.namespace ?? 'data',
          messages: messages.map((msg) => Obj.toJSON(msg as Obj.Any)),
        });
      }
    } catch (err) {
      log.warn('failed to export feed data', { feedId: feedObj.id, error: err });
    }
  }

  return feeds;
};

/**
 * Import feed/queue messages into the target space.
 */
const importFeedData = async (space: Space, feeds: SerializedFeed[]) => {
  const refResolver = space.internal.db.graph.createRefResolver({
    context: { space: space.internal.db.spaceId },
  });

  for (const feedEntry of feeds) {
    const [feedObj] = await space.internal.db.query(Filter.id(feedEntry.feedObjectId)).run();
    if (!feedObj) {
      log.warn('feed object not found after import', { feedObjectId: feedEntry.feedObjectId });
      continue;
    }

    const queueDxn = Feed.getQueueDxn(feedObj as Feed.Feed);
    if (!queueDxn) {
      log.warn('could not derive queue DXN for imported feed', { feedObjectId: feedEntry.feedObjectId });
      continue;
    }

    try {
      const queue = space.queues.get(queueDxn);
      const hydratedMessages = await Promise.all(feedEntry.messages.map((msg) => Obj.fromJSON(msg, { refResolver })));
      await queue.append(hydratedMessages);
    } catch (err) {
      log.warn('failed to import feed data', { feedId: feedEntry.feedObjectId, error: err });
    }
  }
};
