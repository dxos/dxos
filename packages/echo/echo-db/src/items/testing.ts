//
// Copyright 2021 DXOS.org
//

import { Readable } from 'stream';

import { PublicKey } from '@dxos/crypto';
import { EchoEnvelope, MockFeedWriter } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';

import { Database, FeedDatabaseBackend, RemoteDatabaseBackend } from '.';
import { DataServiceHost } from './data-service-host';
import { DataServiceRouter } from './data-service-router';

export const createInMemoryDatabase = async (modelFactory: ModelFactory) => {
  const feed = new MockFeedWriter<EchoEnvelope>();
  const inboundStream = new Readable({ read () {}, objectMode: true });
  feed.written.on(([data, meta]) => inboundStream.push({ data, meta: { ...meta, memberKey: PublicKey.random() } }));

  const database = new Database(
    modelFactory,
    new FeedDatabaseBackend(inboundStream, feed, undefined, { snapshots: true })
  );
  await database.init();
  return database;
};

export const createRemoteDatabaseFromDataServiceHost = async (modelFactory: ModelFactory, dataServiceHost: DataServiceHost) => {
  const partyKey = PublicKey.random();
  const dataServiceRouter = new DataServiceRouter();
  dataServiceRouter.trackParty(partyKey, dataServiceHost);

  const frontend = new Database(
    modelFactory,
    new RemoteDatabaseBackend(dataServiceRouter, partyKey)
  );
  await frontend.init();
  return frontend;
};
