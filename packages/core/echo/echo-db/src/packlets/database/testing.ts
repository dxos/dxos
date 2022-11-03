//
// Copyright 2021 DXOS.org
//

import { MockFeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { EchoEnvelope } from '@dxos/protocols/proto/dxos/echo/feed';
import { Timeframe } from '@dxos/timeframe';

import { DataService } from './data-service';
import { DataServiceHost } from './data-service-host';
import { Database } from './database';
import { FeedDatabaseBackend, RemoteDatabaseBackend } from './database-backend';

export const createInMemoryDatabase = async (modelFactory: ModelFactory) => {
  const feed = new MockFeedWriter<EchoEnvelope>();
  const backend = new FeedDatabaseBackend(feed, undefined, { snapshots: true });

  feed.written.on(([data, meta]) =>
    backend.echoProcessor({
      data,
      meta: {
        ...meta,
        memberKey: PublicKey.random(),
        timeframe: new Timeframe([[meta.feedKey, meta.seq]])
      }
    })
  );

  const database = new Database(modelFactory, backend, PublicKey.random());

  await database.initialize();
  return database;
};

export const createRemoteDatabaseFromDataServiceHost = async (
  modelFactory: ModelFactory,
  dataServiceHost: DataServiceHost
) => {
  const spaceKey = PublicKey.random();
  const dataServiceRouter = new DataService();
  dataServiceRouter.trackParty(spaceKey, dataServiceHost);

  const database = new Database(
    modelFactory,
    new RemoteDatabaseBackend(dataServiceRouter, spaceKey),
    PublicKey.random()
  );

  await database.initialize();
  return database;
};
