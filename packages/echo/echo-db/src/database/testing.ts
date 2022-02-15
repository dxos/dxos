//
// Copyright 2021 DXOS.org
//

import { Readable } from 'stream';

import { PublicKey } from '@dxos/crypto';
import { EchoEnvelope, MockFeedWriter, Timeframe } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';

import { DataServiceHost } from './data-service-host';
import { DataServiceRouter } from './data-service-router';
import { Database } from './database';
import { FeedDatabaseBackend, RemoteDatabaseBackend } from './database-backend';

export const createInMemoryDatabase = async (modelFactory: ModelFactory) => {
  const feed = new MockFeedWriter<EchoEnvelope>();
  const inboundStream = new Readable({ read () {}, objectMode: true });
  feed.written.on(([data, meta]) => inboundStream.push({ data, meta: { ...meta, memberKey: PublicKey.random(), timeframe: new Timeframe([[meta.feedKey, meta.seq]]) } }));

  const database = new Database(
    modelFactory,
    new FeedDatabaseBackend(inboundStream, feed, undefined, { snapshots: true }),
    PublicKey.random(),
  );

  await database.init();
  return database;
};

export const createRemoteDatabaseFromDataServiceHost = async (
  modelFactory: ModelFactory,
  dataServiceHost: DataServiceHost
) => {
  const partyKey = PublicKey.random();
  const dataServiceRouter = new DataServiceRouter();
  dataServiceRouter.trackParty(partyKey, dataServiceHost);

  const frontend = new Database(
    modelFactory,
    new RemoteDatabaseBackend(dataServiceRouter, partyKey),
    PublicKey.random(),
  );
  await frontend.init();
  return frontend;
};
