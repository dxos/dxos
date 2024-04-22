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

const TESTING_SWARM_KEY = '34c6a1e612ce21fa1937b33329b1890450d193a8407e035bdb065ce468479164';

const { prod, endpoint, port, swarmKey } = args
  .option('prod', 'production mode', false)
  .option('endpoint', 'production endpoint', 'labs-workers.dxos.workers.dev')
  .option('port', 'dev server if not in prod mode', 8787)
  .option('swarm-key', 'swarm key', TESTING_SWARM_KEY)
  .parse(process.argv);

const url = prod ? `wss://${endpoint}}` : `ws://localhost:${port}`;

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

  async open(swarmKey: PublicKey) {
    invariant(!this._ws);
    log.info('opening', { peerKey: this._peerKey });

    this._ws = new WebSocket(new URL(`/signal/ws/${swarmKey.toHex()}`, this._url));
    Object.assign(this._ws, {
      onopen: () => {
        log.info('opened', { peerKey: this._peerKey });
        this.send({ data: 'ping' });
      },

      onclose: () => {
        log.info('closed', { peerKey: this._peerKey });
      },

      onerror: (event) => {
        log.catch(event.error, { peerKey: this._peerKey });
      },

      onmessage: (event) => {
        const message = decodeMessage(event.data) ?? {};
        log.info('received', { peerKey: this._peerKey, message });
        const { data } = message;
        if (data === 'pong') {
          this.send({ data: 'hello' });
        }
      },
    } satisfies Partial<WebSocket>);
  }

  async close() {
    if (this._ws) {
      log.info('closing', { peerKey: this._peerKey });
      this._ws.close();
      this._ws = undefined;
    }
  }

  send(message: SwarmMessage) {
    invariant(this._ws);
    log.info('sending', { peerKey: this._peerKey, message });
    this._ws.send(encodeMessage(Object.assign({ peerKey: this._peerKey }, message)));
  }
}

const client = new Client(url);

void client.open(PublicKey.from(swarmKey));

// Catch ctrl-c and safely close down.
process.on('SIGINT', async () => {
  log.info('caught interrupt signal');
  await client.close();
  process.exit();
});
