//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { asyncTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { TestConnection, TestPeer as TestPeerBase } from '@dxos/teleport/testing';

import { Presence } from './presence';

export type TestAgentOptions = {
  peerId?: PublicKey;
  announceInterval?: number;
  offlineTimeout?: number;
};

export class TestAgent extends TestPeerBase {
  public readonly presence: Presence;

  constructor({ peerId = PublicKey.random(), announceInterval = 25, offlineTimeout = 50 }: TestAgentOptions = {}) {
    super(peerId);
    this.presence = new Presence({
      localPeerId: peerId,
      announceInterval,
      offlineTimeout,
      identityKey: PublicKey.random()
    });
  }

  override async onOpen(connection: TestConnection) {
    const extension = this.presence.createExtension({ remotePeerId: connection.teleport!.remotePeerId });
    connection.teleport.addExtension('dxos.mesh.teleport.presence', extension);
  }

  waitForExactAgentsOnline(agents: TestAgent[], timeout = 1000) {
    assert(agents.length > 0, 'At least one agent is required.'); // We will wait for .updated event from the agent itself. And with zero connections it will never happen.
    return asyncTimeout(
      this.presence.updated.waitFor(() => {
        const connections = this.presence.getPeersOnline().map((state) => state.peerId.toHex());
        const expectedConnections = agents.map((agent) => agent.peerId.toHex());
        return (
          connections.length === expectedConnections.length &&
          expectedConnections.every((value) => connections.includes(value))
        );
      }),
      timeout
    );
  }

  override async destroy() {
    await super.destroy();
    await this.presence.destroy();
  }
}
