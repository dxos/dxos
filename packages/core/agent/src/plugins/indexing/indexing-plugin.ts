//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';

import { AbstractPlugin } from '../plugin';

export class Indexing extends AbstractPlugin {
  async open(): Promise<void> {
    this._client!.halo._waitForIdentity()
      .then(async () => {
        const identity = this._client!.halo.identity!.get();
        invariant(identity, 'Identity not initialized.');

        const space = this._client!.getSpace(identity.spaceKey);
        invariant(space, 'Halo space not found.');

        space?.listen('dxos.agent.indexing-plugin', (message) => {
          this._processMessage(message);
        });
      })
      .catch((error) => {
        log.catch(error);
      });
  }

  async close(): Promise<void> {}

  _processMessage(message: GossipMessage) {
    log.info('Received message:', message);
  }
}
