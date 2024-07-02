//
// Copyright 2022 DXOS.org
//

import type { DocHandle } from '@dxos/automerge/automerge-repo';
import { createIdFromSpaceKey } from '@dxos/echo-pipeline';
import { type SpaceDoc, SpaceDocVersion } from '@dxos/echo-protocol';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { ComplexMap } from '@dxos/util';

import { AutomergeContext, type AutomergeContextConfig } from '../core-db';
import { Hypergraph } from '../hypergraph';
import { EchoDatabaseImpl } from '../proxy-db';

/**
 * @deprecated Remove in favour of the new EchoTestBuilder
 */
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
    automergeDocUrl: string = createTestRootDoc(this.automergeContext).url,
  ): Promise<TestPeer> {
    const spaceId = await createIdFromSpaceKey(spaceKey);
    const peer = new TestPeer(this, PublicKey.random(), spaceId, spaceKey, automergeDocUrl);
    this.peers.set(peer.key, peer);
    await peer.db.coreDatabase.open({
      rootUrl: peer.automergeDocId,
    });
    this.graph._register(spaceId, spaceKey, peer.db);
    return peer;
  }

  async flushAll() {
    for (const peer of this.peers.values()) {
      await peer.flush();
    }
  }
}

export const createTestRootDoc = (amContext: AutomergeContext): DocHandle<SpaceDoc> => {
  return amContext.repo.create<SpaceDoc>({ version: SpaceDocVersion.CURRENT });
};

/**
 * @deprecated Remove in favour of the new EchoTestBuilder
 */
export class TestPeer {
  public db = new EchoDatabaseImpl({
    spaceId: this.spaceId,
    spaceKey: this.spaceKey,
    graph: this.builder.graph,
    automergeContext: this.builder.automergeContext,
  });

  constructor(
    public readonly builder: TestBuilder,
    public readonly key: PublicKey,
    public readonly spaceId: SpaceId,
    /** @deprecated Use SpaceId */
    public readonly spaceKey: PublicKey,
    public readonly automergeDocId: string,
  ) {}

  async reload() {
    this.db = new EchoDatabaseImpl({
      spaceId: this.spaceId,
      spaceKey: this.spaceKey,
      graph: this.builder.graph,
      automergeContext: this.builder.automergeContext,
    });
    await this.db.coreDatabase.open({
      rootUrl: this.automergeDocId,
    });
    this.builder.graph._register(this.spaceId, this.spaceKey, this.db);
  }

  async unload() {
    this.builder.graph._unregister(this.spaceId);
  }

  async flush() {
    await this.db.flush();
  }
}
