//
// Copyright 2021 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import { DocumentModel } from '@dxos/document-model';
import { MockFeedWriter } from '@dxos/feed-store/testing';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Timeframe } from '@dxos/timeframe';

import {
  Database,
  DatabaseBackendHost,
  DatabaseBackendProxy,
  DataServiceHost,
  DataServiceImpl,
  DataServiceSubscriptions
} from '../database';
import { DataPipelineController, DataPipelineControllerImpl } from '../space';

export const createMemoryDatabase = async (modelFactory: ModelFactory) => {
  const feed = new MockFeedWriter<DataMessage>();
  const backend = new DatabaseBackendHost(feed, undefined, { snapshots: true });

  feed.written.on(([data, meta]) =>
    backend.echoProcessor({
      data: data.object,
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

export const testLocalDatabase = async (create: DataPipelineControllerImpl, check: DataPipelineControllerImpl = create) => {
  const objectId = PublicKey.random().toHex();
  await create.databaseBackend!.getWriteStream()?.write({
    object: {
      objectId,
      genesis: {
        modelType: DocumentModel.meta.type,
      }
    }
  })

  await asyncTimeout(check._itemManager.update.waitForCondition(() => check._itemManager.entities.has(objectId)), 500);
}