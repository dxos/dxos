//
// Copyright 2024 DXOS.org
//

import args from 'args';
import WebSocket from 'ws';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

// TODO(burdon): Factor out non-client deps.
import { decodeMessage, encodeMessage, type SwarmMessage } from '../signaling/protocol';

const { prod, endpoint, port, swarmKey } = args
  .option('prod', 'production mode', false)
  .option('endpoint', 'production endpoint', 'labs-workers.dxos.workers.dev')
  .option('port', 'dev server if not in prod mode', 8787)
  .option('swarm-key', 'swarm key', 'test-swarm-key')
  .parse(process.argv);

const url = prod ? `wss://${endpoint}}/signal/ws` : `ws://localhost:${port}/signal/ws`;

/**
 * Test client.
 *
 * ```bash
 * npx ts-node ./src/client/client.ts
 * ```
 */
class Client {
  private readonly _peerKey = PublicKey.random();
  private _ws?: WebSocket;

  constructor(private readonly _url: string) {}

  isOpen() {
    return !!this._ws;
  }

  async open() {
    invariant(!this._ws);
    log.info('opening', { peer: this._peerKey });

    this._ws = new WebSocket(this._url);
    Object.assign(this._ws, {
      onopen: () => {
        log.info('opened');
        this.send({
          swarmKey,
          peerKey: this._peerKey.toHex(),
          data: 'join',
        });
      },

      onclose: () => {
        log.info('closed');
      },

      onerror: (event) => {
        log.catch(event.error);
      },

      onmessage: (event) => {
        const { data } = decodeMessage(event.data) ?? {};
        log.info('received', { data });

        if (data) {
          this.send({
            // swarmKey,
            peerKey: this._peerKey.toHex(),
            data: 'ping',
          });
        }
      },
    } satisfies Partial<WebSocket>);
  }

  async close() {
    if (this._ws) {
      log.info('closing', { peer: this._peerKey });
      this._ws.close();
      this._ws = undefined;
    }
  }

  send(message: SwarmMessage) {
    invariant(this._ws);
    log.info('sending', { message });
    this._ws.send(encodeMessage(message));
  }
}

const client = new Client(url);
void client.open();

// Catch ctrl-c and safely close down.
process.on('SIGINT', async () => {
  log.info('caught interrupt signal');
  await client.close();
  process.exit();
});
