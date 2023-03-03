//
// Copyright 2023 DXOS.org
//

import { sleep, Event, Trigger } from '@dxos/async';
import { Client, ClientServicesProvider, Space } from '@dxos/client';
import { clientServiceBundle } from '@dxos/client-services';
import { PublicKey } from '@dxos/keys';
import { AuthMethod } from '@dxos/protocols/proto/dxos/halo/invitations';
import { WebsocketRpcClient } from '@dxos/websocket-rpc';

// const DOCKER_URL = 'https://cors-anywhere.herokuapp.com/' + 'http://198.211.114.136:4243';

// socat -d TCP-LISTEN:2376,range=127.0.0.1/32,reuseaddr,fork UNIX:/var/run/docker.sock
// cors-proxy-server

export const DOCKER_URL = 'http://127.0.0.1:2376';

// TODO(dmaretskyi): Extract.
export const fromRemote = (url: string): ClientServicesProvider => {
  const dxrpcClient = new WebsocketRpcClient({
    url,
    requested: clientServiceBundle,
    exposed: {},
    handlers: {}
  });

  return {
    get descriptors() {
      return clientServiceBundle;
    },

    get services() {
      return dxrpcClient.rpc;
    },

    open: () => dxrpcClient.open(),
    close: () => dxrpcClient.close()
  };
};

/**
 *
 */
export class BotClient {
  public readonly onStatusUpdate = new Event<string>();

  constructor(private readonly _space: Space) {}

  async refresh(): Promise<any> {
    // https://docs.docker.com/engine/api/v1.42/
    return fetch(`${DOCKER_URL}/containers/json?all=true`).then((r) => r.json());
  }

  async addBot() {
    this.onStatusUpdate.emit('Creating container...');
    const name = 'bot-' + PublicKey.random().toHex().slice(0, 8);
    const port = Math.floor(Math.random() * 1000) + 3000;
    const response = await fetch(`${DOCKER_URL}/containers/create?name=${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Image: 'bot-test',
        ExposedPorts: {
          '3023/tcp': {}
        },
        HostConfig: {
          PortBindings: {
            '3023/tcp': [
              {
                HostPort: `${port}`
              }
            ]
          }
        },
        Env: ['LOG_FILTER=debug'],
        Labels: {
          'dxos.bot': `${true}`,
          'dxos.bot.dxrpc-port': `${port}`
        }
      })
    });
    const data = await response.json();
    console.log(data);

    this.onStatusUpdate.emit('Starting container...');
    await fetch(`${DOCKER_URL}/containers/${data.Id}/start`, {
      method: 'POST'
    });

    this.onStatusUpdate.emit('Waiting for bot to start...');
    const botEndpoint = `ws://127.0.0.1:${port}`;

    while (true) {
      try {
        await fetch(`http://127.0.0.1:${port}`);
        break;
      } catch (err) {
        console.log(err);
      }
      await sleep(500);
    }
    this.onStatusUpdate.emit('Connecting to bot...');

    const botClient = new Client({
      services: fromRemote(botEndpoint)
    });

    await botClient.initialize();

    console.log('status', await botClient.getStatus());
    this.onStatusUpdate.emit('Initializing bot...');

    await botClient.halo.createIdentity({
      displayName: name
    });

    this.onStatusUpdate.emit('Adding bot to space...');
    console.log({ space: this._space.key });

    {
      const trg = new Trigger();
      const invitation = this._space.createInvitation({
        authMethod: AuthMethod.NONE
      });
      invitation.subscribe({
        onConnecting: async (invitation1) => {
          console.log('invitation1', invitation1);
          const observable2 = botClient.echo.acceptInvitation(invitation1);
          observable2.subscribe({
            onSuccess: async (invitation2) => {
              trg.wake();
            },
            onCancelled: () => console.error(new Error('cancelled')),
            onTimeout: (err: Error) => console.error(new Error(err.message)),
            onError: (err: Error) => console.error(new Error(err.message))
          });
        },
        onConnected: async (invitation1) => {
          console.log('connected');
        },
        onSuccess: async (invitation1) => {
          console.log('success');
        },
        onCancelled: () => console.error(new Error('cancelled')),
        onTimeout: (err: Error) => console.error(new Error(err.message)),
        onError: (err: Error) => console.error(new Error(err.message))
      });

      await trg.wait();
    }

    this.onStatusUpdate.emit('Done');
  }
}
