//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { ComplexMap } from '@dxos/util';

import { AutomergeContext, type AutomergeContextConfig } from '../automerge';
import { EchoDatabaseImpl } from '../database';
import { Hypergraph } from '../hypergraph';
import { schemaBuiltin } from '../proto';

export type CreateDatabaseOpts = {
  useReactiveObjectApi?: boolean;
};

/**
 * @deprecated Use TestBuilder.
 */
// TODO(burdon): Builder pattern.
export const createDatabase = async (
  graph = new Hypergraph(),
  { useReactiveObjectApi }: CreateDatabaseOpts = { useReactiveObjectApi: true },
) => {
  graph.addTypes(schemaBuiltin);

  const spaceKey = PublicKey.random();
  const automergeContext = new AutomergeContext();
  const db = new EchoDatabaseImpl({ graph, automergeContext, spaceKey, useReactiveObjectApi });
  await db.automerge.open({
    rootUrl: automergeContext.repo.create().url,
  });
  graph._register(spaceKey, db); // TODO(burdon): Database should have random id?
  return { db, graph };
};

export class TestBuilder {
  public readonly defaultSpaceKey = PublicKey.random();
  public readonly graph = new Hypergraph();

  public readonly automergeContext;

  constructor(automergeConfig?: AutomergeContextConfig) {
    this.automergeContext = new AutomergeContext(undefined, automergeConfig);
  }

  public readonly peers = new ComplexMap<PublicKey, TestPeer>(PublicKey.hash);

  async createPeer(
    spaceKey = this.defaultSpaceKey,
    automergeDocUrl: string = this.automergeContext.repo.create().url,
  ): Promise<TestPeer> {
    const peer = new TestPeer(this, PublicKey.random(), spaceKey, automergeDocUrl);
    this.peers.set(peer.key, peer);
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
  public db = new EchoDatabaseImpl({
    spaceKey: this.spaceKey,
    graph: this.builder.graph,
    automergeContext: this.builder.automergeContext,
    useReactiveObjectApi: true,
  });

  constructor(
    public readonly builder: TestBuilder,
    public readonly key: PublicKey,
    public readonly spaceKey: PublicKey,
    public readonly automergeDocId: string,
  ) {}

  async reload() {
    this.db = new EchoDatabaseImpl({
      spaceKey: this.spaceKey,
      graph: this.builder.graph,
      automergeContext: this.builder.automergeContext,
    });
    await this.db.automerge.open({
      rootUrl: this.automergeDocId,
    });
    this.builder.graph._register(this.spaceKey, this.db);
  }

  async unload() {
    this.builder.graph._unregister(this.spaceKey);
  }

  async flush() {
    await this.db.flush();
  }
}
