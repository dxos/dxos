import { PublicKey } from '@dxos/crypto'
import { EchoEnvelope, MockFeedWriter } from '@dxos/echo-protocol'
import { ModelFactory } from '@dxos/model-factory'
import { ObjectModel } from '@dxos/object-model'
import { it as test } from 'mocha'
import { Readable } from 'stream'
import { Database, TimeframeClock } from '..'
import { DataServiceRouter } from './data-service-router'
import { FeedDatabaseBackend, RemoteDatabaseBacked } from './database-backend'
import expect from 'expect'
import { afterTest } from '@dxos/testutils'

describe('Database', () => {
  describe('remote', () => {
    test.only('gets items synced from backend', async () => {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);

      const feed = new MockFeedWriter<EchoEnvelope>();
      const inboundStream = new Readable({ read() {}, objectMode: true })
      feed.written.on(([data, meta]) => inboundStream.push({ data, meta }))

      const backend = new Database(
        modelFactory,
        new FeedDatabaseBackend(inboundStream, feed, undefined, {snapshots: true})
      )
      await backend.init();
      afterTest(() => backend.destroy());

      const partyKey = PublicKey.random()
      const dataServiceRouter = new DataServiceRouter()
      dataServiceRouter.trackParty(partyKey, backend.createDataServiceHost())
        
      const frontend = new Database(
        modelFactory,
        new RemoteDatabaseBacked(dataServiceRouter, partyKey)
      )
      await frontend.init();
      afterTest(() => frontend.destroy());

      const [,backendItem] = await Promise.all([
        frontend.update.waitForCount(1),
        backend.createItem({ model: ObjectModel })
      ])

      const item = frontend.getItem(backendItem.id);

      expect(item).not.toBeUndefined()
      expect(item!.model).toBeInstanceOf(ObjectModel)

      // Mutate model
      await Promise.all([
        item!.model.modelUpdate.waitForCount(1),
        backendItem.model.setProperty('foo', 'bar')
      ])

      expect(item!.model.getProperty('foo')).toEqual('bar')
    })
  })
})