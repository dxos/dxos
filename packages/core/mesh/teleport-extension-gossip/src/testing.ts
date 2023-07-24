//
// Copyright 2022 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { invariant } from '@dxos/log';
import { TestConnection, TestPeer as TestPeerBase } from '@dxos/teleport/testing';

import { Gossip } from './gossip';
import { Presence } from './presence';

export type TestAgentOptions = {
  peerId?: PublicKey;
  announceInterval?: number;
  offlineTimeout?: number;
};

export class TestAgent extends TestPeerBase {
  public readonly gossip: Gossip;
  public readonly presence: Presence;

  constructor({ peerId = PublicKey.random(), announceInterval = 25, offlineTimeout = 50 }: TestAgentOptions = {}) {
    super(peerId);
    this.gossip = new Gossip({
      localPeerId: peerId,
    });
    this.presence = new Presence({
      announceInterval,
      offlineTimeout,
      identityKey: peerId,
      gossip: this.gossip,
    });
  }

  override async onOpen(connection: TestConnection) {
    const extension = this.gossip.createExtension({ remotePeerId: connection.teleport!.remotePeerId });
    connection.teleport.addExtension('dxos.mesh.teleport.gossip', extension);
  }

  waitForAgentsOnline(agents: TestAgent[], timeout = 1000) {
    invariant(agents.length > 0, 'At least one agent is required.'); // We will wait for .updated event from the agent itself. And with zero connections it will never happen.
    return asyncTimeout(
      this.presence.updated.waitFor(() => {
        const connections = this.presence.getPeersOnline().map((state) => state.identityKey.toHex());
        const expectedConnections = agents.map((agent) => agent.peerId.toHex());
        return expectedConnections.every((value) => connections.includes(value));
      }),
      timeout,
    );
  }

  override async destroy() {
    await super.destroy();
    await this.gossip.destroy();
    await this.presence.destroy();
  }
}
