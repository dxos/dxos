//
// Copyright 2023 DXOS.org
//

import { Index } from 'lunr';
import { existsSync, readFileSync } from 'node:fs';

import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';

import { AbstractPlugin } from '../plugin';

export class Indexing extends AbstractPlugin {
  private readonly _ctx = new Context();
  private readonly _index?: Index;

  constructor(private readonly _indexPath: string) {
    super();
    if (existsSync(_indexPath)) {
      try {
        const serializedIndex = readFileSync(_indexPath, { encoding: 'utf8' });
        this._index = Index.load(JSON.parse(serializedIndex));
      } catch (error) {
        log.warn('Failed to load index from file:', { error });
      }
    }
  }

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
      .catch((error: Error) => log.catch(error));

    this.indexSpaces().catch((error: Error) => log.catch(error));
  }

  async close(): Promise<void> {
    void this._ctx.dispose();
  }

  async indexSpaces(): Promise<void> {
    
  }

  _processMessage(message: GossipMessage) {
    log.info('Received message:', message);
  }
}
