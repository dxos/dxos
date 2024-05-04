//
// Copyright 2024 DXOS.org
//

import args from 'args';
import WebSocket from 'ws';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { decodeMessage, encodeMessage, type Message } from '../protocol';

const TEST_IDENTITY_KEY = '34c6a1e612ce21fa1937b33329b1890450d193a8407e035bdb065ce468479164';
const TEST_SPACE_KEY = '4a138aed546a789b17ab702190a7f4382b2c92826247d1c7620287b49536666f';

const { prod, endpoint, port, identityKey } = args
  .option('prod', 'production mode', false)
  .option('endpoint', 'production endpoint', 'signaling.dxos.workers.dev')
  .option('port', 'dev server if not in prod mode', 8787)
  .option('identity-key', 'identity key', TEST_IDENTITY_KEY)
  .parse(process.argv);

const url = prod ? `wss://${endpoint}}` : `ws://localhost:${port}`;

/**
 * Test client.
 *
 * ```bash
 * npx ts-node ./src/client/client.ts
 * ```
 */
class TestClient {
  private readonly _deviceKey = PublicKey.random();
  private _ws?: WebSocket;

  constructor(private readonly _url: string) {}

  isOpen() {
    return !!this._ws;
  }

  async open(swarmKey: PublicKey) {
    invariant(!this._ws);
    log.info('opening', { deviceKey: this._deviceKey });

    this._ws = new WebSocket(new URL(`/signaling/ws/${swarmKey.toHex()}/${this._deviceKey.toHex()}`, this._url));
    Object.assign(this._ws, {
      onopen: () => {
        log.info('opened', { deviceKey: this._deviceKey });
        this.send({ type: 'join', data: { swarmKey: TEST_IDENTITY_KEY } });
        // this.send({ type: 'join', data: { swarmKey: TEST_SPACE_KEY } });
      },

      onclose: () => {
        log.info('closed', { deviceKey: this._deviceKey });
      },

      onerror: (event) => {
        log.catch(event.error, { deviceKey: this._deviceKey });
      },

      onmessage: (event) => {
        const message = decodeMessage(event.data);
        log.info('received', { deviceKey: this._deviceKey, message });
        switch (message?.type) {
          case 'info': {
            // TODO(burdon): Select peer and make offer.
            // const { peerKeys } = message.data as SwarmPayload;
            // if (peerKeys?.length) {
            //   this.send({ type: 'offer', recipient: peerKeys[0] });
            // }
            break;
          }
        }
      },
    } satisfies Partial<WebSocket>);
  }

  async close() {
    if (this._ws) {
      log.info('closing', { deviceKey: this._deviceKey });
      this._ws.close();
      this._ws = undefined;
    }
  }

  send(message: Message) {
    invariant(this._ws);
    log.info('sending', { deviceKey: this._deviceKey, message });
    this._ws.send(encodeMessage(message));
  }
}

const client = new TestClient(url);

void client.open(PublicKey.from(identityKey));

// Catch ctrl-c and safely close down.
process.on('SIGINT', async () => {
  log.info('caught interrupt signal');
  await client.close();
  process.exit();
});
