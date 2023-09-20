//
// Copyright 2023 DXOS.org
//

import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';

import { AbstractPlugin } from '../plugin';

export class Indexing extends AbstractPlugin {
  private readonly _ctx = new Context();

  async open(): Promise<void> {
    log.info('Opening indexing plugin...');
    this._client!.spaces.isReady.wait()
      .then(async () => {
        invariant(this._client, 'Client is undefined.');

        const space = this._client.spaces.default;

        const unsubscribe = space.listen('dxos.agent.indexing-plugin', (message) => {
          this._processMessage(message);
        });
        log.info('Listening for indexing messages at default space.', { spaceKey: space.key.toHex() });

        this._ctx.onDispose(unsubscribe);
      })
      .catch((error: Error) => {
        log.catch(error);
      });
  }

  async close(): Promise<void> {
    void this._ctx.dispose();
  }

  _processMessage(message: GossipMessage) {
    log.info('Received message:', message);
  }
}
