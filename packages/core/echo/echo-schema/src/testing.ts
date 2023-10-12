//
// Copyright 2022 DXOS.org
//

import { DocumentModel } from '@dxos/document-model';
import { DatabaseProxy } from '@dxos/echo-db';
import {
  createMemoryDatabase,
  createRemoteDatabaseFromDataServiceHost,
  DatabaseTestBuilder,
  DatabaseTestPeer as BasePeer,
} from '@dxos/echo-pipeline/testing';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { TextModel } from '@dxos/text-model';
import { ComplexMap } from '@dxos/util';

import { EchoDatabase } from './database';
import { HyperGraph } from './hyper-graph';
import { schemaBuiltin } from './proto';

// TODO(burdon): Builder pattern.
// TODO(burdon): Rename createMemoryDatabase.
/**
 * @deprecated Use TestBuilder.
 */
export const createDatabase = async (graph = new HyperGraph()) => {
  // prettier-ignore
  const modelFactory = new ModelFactory()
    .registerModel(DocumentModel)
    .registerModel(TextModel);

  graph.addTypes(schemaBuiltin);

  // TODO(dmaretskyi): Fix.
  const host = await createMemoryDatabase(modelFactory);
  const proxy = await createRemoteDatabaseFromDataServiceHost(modelFactory, host.backend.createDataServiceHost());
  const db = new EchoDatabase(proxy.itemManager, proxy.backend as DatabaseProxy, graph);
  graph._register(PublicKey.random(), db); // TODO(burdon): Database should have random id?
  return { db, host };
};

export class TestBuilder {
  public readonly defaultSpaceKey = PublicKey.random();

  constructor(public readonly graph = new HyperGraph(), public readonly base = new DatabaseTestBuilder()) {}

  public readonly peers = new ComplexMap<PublicKey, TestPeer>(PublicKey.hash);

  async createPeer(spaceKey = this.defaultSpaceKey): Promise<TestPeer> {
    const base = await this.base.createPeer(spaceKey);
    const peer = new TestPeer(this, base);
    this.peers.set(peer.base.key, peer);
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
  public db = new EchoDatabase(this.base.items, this.base.proxy, this.builder.graph);

  constructor(public readonly builder: TestBuilder, public readonly base: BasePeer) {}

  async reload() {
    await this.base.reload();
    this.db = new EchoDatabase(this.base.items, this.base.proxy, this.builder.graph);
  }

  async flush() {
    if (this.db._backend.currentBatch) {
      this.db._backend.commitBatch();
    }
    await this.base.confirm();
    await this.db.flush();
  }
}
