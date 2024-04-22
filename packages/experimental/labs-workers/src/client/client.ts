//
// Copyright 2024 DXOS.org
//

import WebSocket from 'ws';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type SwarmMessage } from '../signaling';

const port = 9000;
const dev = true; // TODO(burdon): args.

const url = dev ? `ws://localhost:${port}/signal/ws` : 'wss://labs-workers.dxos.workers.dev/signal/ws';

// TODO(burdon): How do individual peers connect in an existing swarm? Routing?

const swarmKey = 'xxx';

/**
 * Test client.
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
