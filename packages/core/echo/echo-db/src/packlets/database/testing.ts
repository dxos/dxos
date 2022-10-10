//
// Copyright 2021 DXOS.org
//

import { MockFeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { Timeframe } from '@dxos/protocols';
import { EchoEnvelope } from '@dxos/protocols/proto/dxos/echo/feed';

import { DataService } from './data-service.js';
import { DataServiceHost } from './data-service-host.js';
import { Database } from './database.js';
import { FeedDatabaseBackend, RemoteDatabaseBackend } from './database-backend.js';

export const createInMemoryDatabase = async (modelFactory: ModelFactory) => {
  const feed = new MockFeedWriter<EchoEnvelope>();
  const backend = new FeedDatabaseBackend(feed, undefined, { snapshots: true });

  feed.written.on(([data, meta]) => backend.echoProcessor({
    data,
    meta: {
      ...meta,
      memberKey: PublicKey.random(),
      timeframe: new Timeframe([[meta.feedKey, meta.seq]])
    }
  }));

  const database = new Database(modelFactory, backend, PublicKey.random());

  await database.initialize();
  return database;
};

export const createRemoteDatabaseFromDataServiceHost = async (
  modelFactory: ModelFactory,
  dataServiceHost: DataServiceHost
) => {
  const partyKey = PublicKey.random();
  const dataServiceRouter = new DataService();
  dataServiceRouter.trackParty(partyKey, dataServiceHost);

  const database = new Database(
    modelFactory,
    new RemoteDatabaseBackend(dataServiceRouter, partyKey),
    PublicKey.random()
  );

  await database.initialize();
  return database;
};
