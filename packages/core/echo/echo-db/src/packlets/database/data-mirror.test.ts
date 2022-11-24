//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { asyncTimeout } from '@dxos/async';
import { MockFeedWriter } from '@dxos/feed-store/testing';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { EchoEnvelope } from '@dxos/protocols/proto/dxos/echo/feed';
import { Timeframe } from '@dxos/timeframe';

import { DataMirror } from './data-mirror';
import { DataServiceImpl, DataServiceSubscriptions } from './data-service';
import { DataServiceHost } from './data-service-host';
import { Item } from './item';
import { ItemDemuxer } from './item-demuxer';
import { ItemManager } from './item-manager';

describe('DataMirror', function () {
  it('basic', async function () {
    // Setup
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const feed = new MockFeedWriter<EchoEnvelope>();
    const itemManager = new ItemManager(modelFactory, PublicKey.random(), feed);
    const itemDemuxer = new ItemDemuxer(itemManager, modelFactory, {
      snapshots: true
    });

    const process = itemDemuxer.open();
    feed.written.on(([msg, meta]) =>
      process({
        data: msg,
        meta: {
          ...meta,
          memberKey: PublicKey.random(),
          timeframe: new Timeframe()
        }
      } as any)
    );

    const dataServiceHost = new DataServiceHost(itemManager, itemDemuxer);
    const dataServiceSubscriptions = new DataServiceSubscriptions();
    const dataService = new DataServiceImpl(dataServiceSubscriptions);

    const spaceKey = PublicKey.random();
    dataServiceSubscriptions.registerSpace(spaceKey, dataServiceHost);

    const mirrorItemManager = new ItemManager(modelFactory, PublicKey.random());
    const dataMirror = new DataMirror(mirrorItemManager, dataService, spaceKey);

    dataMirror.open();

    // Create item
    const promise = asyncTimeout(mirrorItemManager.debouncedUpdate.waitForCount(1), 1000, new Error('timeout'));

    const item = (await itemManager.createItem(ObjectModel.meta.type)) as Item<ObjectModel>;

    await promise;

    const mirroredItem = (await mirrorItemManager.getItem(item.id)) as Item<ObjectModel> | undefined;

    expect(mirroredItem).not.toBeUndefined();
    expect(mirroredItem!.id).toEqual(item.id);
    expect(mirroredItem!.model).toBeInstanceOf(ObjectModel);

    // Mutate model
    await Promise.all([
      asyncTimeout(mirroredItem!.model.update.waitForCount(1), 1000, new Error('timeout')),
      item.model.set('foo', 'bar')
    ]);

    expect(item.model.get('foo')).toEqual('bar');
  });
});
