//
// Copyright 2021 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import { DocumentModel } from '@dxos/document-model';
import { DatabaseProxy, ItemManager } from '@dxos/echo-db';
import { MockFeedWriter } from '@dxos/feed-store/testing';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Timeframe } from '@dxos/timeframe';

import { DatabaseHost, DataServiceHost, DataServiceImpl, DataServiceSubscriptions } from '../db-host';
import { DataPipeline } from '../space';

export const createMemoryDatabase = async (modelFactory: ModelFactory) => {
  const feed = new MockFeedWriter<DataMessage>();
  const backend = new DatabaseHost(feed, async () => {
    // No-op.
  });

  feed.written.on(([data, meta]) =>
    backend.echoProcessor({
      batch: data.batch,
      meta: {
        ...meta,
        memberKey: PublicKey.random(),
        timeframe: new Timeframe([[meta.feedKey, meta.seq]]),
      },
    }),
  );

  const itemManager = new ItemManager(modelFactory);
  await backend.open(itemManager, new ModelFactory().registerModel(DocumentModel));
  return {
    backend,
    itemManager,
  };
};

export const createRemoteDatabaseFromDataServiceHost = async (
  modelFactory: ModelFactory,
  dataServiceHost: DataServiceHost,
) => {
  const dataServiceSubscriptions = new DataServiceSubscriptions();
  const dataService = new DataServiceImpl(dataServiceSubscriptions);

  const spaceKey = PublicKey.random();
  await dataServiceSubscriptions.registerSpace(spaceKey, dataServiceHost);

  const itemManager = new ItemManager(modelFactory);
  const backend = new DatabaseProxy({ service: dataService, itemManager, spaceKey });
  await backend.open(new ModelFactory().registerModel(DocumentModel));
  return {
    itemManager,
    backend,
  };
};

export const testLocalDatabase = async (create: DataPipeline, check: DataPipeline = create) => {
  const objectId = PublicKey.random().toHex();
  await create.databaseHost!.getWriteStream()?.write({
    batch: {
      objects: [
        {
          objectId,
          genesis: {
            modelType: DocumentModel.meta.type,
          },
        },
      ],
    },
  });

  await asyncTimeout(
    check.databaseHost!._itemDemuxer.mutation.waitForCondition(() => check.itemManager.entities.has(objectId)),
    2000,
  );
};
