//
// Copyright 2024 DXOS.org
//

import args from 'args';
import WebSocket from 'ws';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type SwarmMessage } from '../signaling';

const { prod, endpoint, port } = args
  .option('prod', 'production mode', false)
  .option('endpoint', 'production endpoint', 'labs-workers.dxos.workers.dev')
  .option('port', 'dev server if not in prod mode', 8787)
  .parse(process.argv);

const url = prod ? `wss://${endpoint}}/signal/ws` : `ws://localhost:${port}/signal/ws`;

// TODO(burdon): How do individual peers connect in an existing swarm? Routing?

const swarmKey = 'xxx';

process.exit();

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
        this._ws?.send(
          JSON.stringify({
            peerKey: this._peerKey.toHex(),
            swarmKey,
            data: 'ping',
          } satisfies SwarmMessage),
        );
      },

      onclose: () => {
        log.info('closed');
      },

      onerror: (event) => {
        log.catch(event.error);
      },

      onmessage: (event) => {
        const data = JSON.parse(event.data.toString());
        log.info('received', { data });
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
}

// TODO(burdon): Catch ctrl-c and safely close down.
void new Client(url).open();
