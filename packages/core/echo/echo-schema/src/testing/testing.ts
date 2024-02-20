//
// Copyright 2022 DXOS.org
//

import { DocumentModel } from '@dxos/document-model';
import { type DatabaseProxy } from '@dxos/echo-db';
import {
  DatabaseTestBuilder,
  createMemoryDatabase,
  createRemoteDatabaseFromDataServiceHost,
  type DatabaseTestPeer as BasePeer,
} from '@dxos/echo-pipeline/testing';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { TextModel } from '@dxos/text-model';
import { ComplexMap } from '@dxos/util';

import { AutomergeContext } from '../automerge';
import { EchoDatabaseImpl } from '../database';
import { Hypergraph } from '../hypergraph';
import { schemaBuiltin } from '../proto';

/**
 * @deprecated Use TestBuilder.
 */
// TODO(burdon): Builder pattern.
export const createDatabase = async (graph = new Hypergraph()) => {
  // prettier-ignore
  const modelFactory = new ModelFactory()
    .registerModel(DocumentModel)
    .registerModel(TextModel);

  graph.addTypes(schemaBuiltin);

  // TODO(dmaretskyi): Fix.
  const host = await createMemoryDatabase(modelFactory);
  const proxy = await createRemoteDatabaseFromDataServiceHost(modelFactory, host.backend.createDataServiceHost());
  const automergeContext = new AutomergeContext();
  const db = new EchoDatabaseImpl(proxy.itemManager, proxy.backend as DatabaseProxy, graph, automergeContext);
  await db.automerge.open({
    rootUrl: automergeContext.repo.create().url,
  });
  graph._register(proxy.backend.spaceKey, db); // TODO(burdon): Database should have random id?
  return { db, host };
};

export class TestBuilder {
  public readonly defaultSpaceKey = PublicKey.random();
  public readonly automergeContext = new AutomergeContext();

  constructor(
    public readonly graph = new Hypergraph(),
    public readonly base = new DatabaseTestBuilder(),
  ) {}

  public readonly peers = new ComplexMap<PublicKey, TestPeer>(PublicKey.hash);

  async createPeer(spaceKey = this.defaultSpaceKey): Promise<TestPeer> {
    const base = await this.base.createPeer(spaceKey);
    const peer = new TestPeer(this, base, spaceKey, this.automergeContext.repo.create().url);
    this.peers.set(peer.base.key, peer);
    await peer.db.automerge.open({
      rootUrl: peer.automergeDocId,
    });
    this.graph._register(spaceKey, peer.db);
    return peer;
  }

  async flushAll() {
    for (const peer of this.peers.values()) {
      await peer.flush();
    }
  }
}

export class TestPeer {
  public db = new EchoDatabaseImpl(this.base.items, this.base.proxy, this.builder.graph, this.builder.automergeContext);

  constructor(
    public readonly builder: TestBuilder,
    public readonly base: BasePeer,
    public readonly spaceKey: PublicKey,
    public readonly automergeDocId: string,
  ) {}

  async reload() {
    await this.base.reload();
    this.db = new EchoDatabaseImpl(this.base.items, this.base.proxy, this.builder.graph, this.builder.automergeContext);
    await this.db.automerge.open({
      rootUrl: this.automergeDocId,
    });
    this.builder.graph._register(this.spaceKey, this.db);
  }

  async unload() {
    this.builder.graph._unregister(this.spaceKey);
  }

  async flush() {
    if (this.db._backend.currentBatch) {
      this.db._backend.commitBatch();
    }
    await this.base.confirm();
    await this.db.flush();
  }
}
