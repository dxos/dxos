//
// Copyright 2021 DXOS.org
//

import { MockFeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { EchoEnvelope } from '@dxos/protocols/proto/dxos/echo/feed';
import { Timeframe } from '@dxos/timeframe';

import { DataServiceImpl, DataServiceSubscriptions } from './data-service';
import { DataServiceHost } from './data-service-host';
import { Database } from './database';
import { DatabaseBackendHost, DatabaseBackendProxy } from './database-backend';

export const createInMemoryDatabase = async (modelFactory: ModelFactory) => {
  const feed = new MockFeedWriter<EchoEnvelope>();
  const backend = new DatabaseBackendHost(feed, undefined, { snapshots: true });

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
  const dataServiceSubscriptions = new DataServiceSubscriptions();
  const dataService = new DataServiceImpl(dataServiceSubscriptions);

  const spaceKey = PublicKey.random();
  dataServiceSubscriptions.registerSpace(spaceKey, dataServiceHost);

  const database = new Database(modelFactory, new DatabaseBackendProxy(dataService, spaceKey), PublicKey.random());

  await database.initialize();
  return database;
};
