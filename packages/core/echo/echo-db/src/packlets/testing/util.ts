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
  DatabaseBackendHost,
  DatabaseBackendProxy,
  DataServiceHost,
  DataServiceImpl,
  DataServiceSubscriptions,
  ItemManager
} from '../database';
import { DataPipelineControllerImpl } from '../space';

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

  const itemManager = new ItemManager(modelFactory, PublicKey.random(), backend.getWriteStream());
  await backend.open(itemManager, new ModelFactory().registerModel(DocumentModel));
  return {
    backend,
    itemManager
  };
};

export const createRemoteDatabaseFromDataServiceHost = async (
  modelFactory: ModelFactory,
  dataServiceHost: DataServiceHost
) => {
  const dataServiceSubscriptions = new DataServiceSubscriptions();
  const dataService = new DataServiceImpl(dataServiceSubscriptions);

  const spaceKey = PublicKey.random();
  dataServiceSubscriptions.registerSpace(spaceKey, dataServiceHost);

  const backend = new DatabaseBackendProxy(dataService, spaceKey);
  const itemManager = new ItemManager(modelFactory, PublicKey.random(), backend.getWriteStream());
  await backend.open(itemManager, new ModelFactory().registerModel(DocumentModel));
  return {
    itemManager,
    backend
  };
};

export const testLocalDatabase = async (
  create: DataPipelineControllerImpl,
  check: DataPipelineControllerImpl = create
) => {
  const objectId = PublicKey.random().toHex();
  await create.databaseBackend!.getWriteStream()?.write({
    object: {
      objectId,
      genesis: {
        modelType: DocumentModel.meta.type
      }
    }
  });

  await asyncTimeout(
    check._itemManager.update.waitForCondition(() => check._itemManager.entities.has(objectId)),
    500
  );
};
