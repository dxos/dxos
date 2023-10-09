//
// Copyright 2022 DXOS.org
//

import { DocumentModel } from '@dxos/document-model';
import { DatabaseProxy } from '@dxos/echo-db';
import { createMemoryDatabase, createRemoteDatabaseFromDataServiceHost } from '@dxos/echo-pipeline/testing';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { TextModel } from '@dxos/text-model';
import { DatabaseTestBuilder, DatabaseTestPeer as BasePeer } from '@dxos/echo-pipeline/testing';

import { EchoDatabase } from './database';
import { DatabaseRouter } from './router';
import { ComplexMap } from '@dxos/util';
import { schemaBuiltin } from './proto';

// TODO(burdon): Builder pattern.
// TODO(burdon): Rename createMemoryDatabase.
export const createDatabase = async (router = new DatabaseRouter()) => {
  // prettier-ignore
  const modelFactory = new ModelFactory()
    .registerModel(DocumentModel)
    .registerModel(TextModel);

  router.schema.mergeSchema(schemaBuiltin)

  // TODO(dmaretskyi): Fix.
  const host = await createMemoryDatabase(modelFactory);
  const proxy = await createRemoteDatabaseFromDataServiceHost(modelFactory, host.backend.createDataServiceHost());
  const db = new EchoDatabase(proxy.itemManager, proxy.backend as DatabaseProxy, router);
  router.register(PublicKey.random(), db); // TODO(burdon): Database should have random id?
  return { db, host };
};


export class TestBuilder {
  public readonly spaceKey = PublicKey.random();

  constructor(
    public readonly router = new DatabaseRouter(),
    public readonly base = new DatabaseTestBuilder(),
  ) {}
    
  public readonly peers = new ComplexMap<PublicKey, TestPeer>(PublicKey.hash);

  async createPeer(): Promise<TestPeer> {
    const base = await this.base.createPeer();
    const peer = new TestPeer(this, base);
    this.peers.set(peer.base.key, peer);
    this.router.register(this.spaceKey, peer.db);
    await peer.base.open();
    return peer;
  }
}

export class TestPeer {
  public db = new EchoDatabase(this.base.items, this.base.proxy, this.builder.router);

  constructor(
    public readonly builder: TestBuilder,
    public readonly base: BasePeer,
  ) {}

  async reload() {
    await this.base.reload();
    this.db = new EchoDatabase(this.base.items, this.base.proxy, this.builder.router)
  }
}