//
// Copyright 2023 DXOS.org
//

import { sleep, Event, Trigger } from '@dxos/async';
import { Client, ClientServicesProvider, Space } from '@dxos/client';
import { clientServiceBundle } from '@dxos/client-services';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { AuthMethod } from '@dxos/protocols/proto/dxos/halo/invitations';
import { WebsocketRpcClient } from '@dxos/websocket-rpc';

// TODO(burdon): Import from @dxos/bot-lab. ENV/config.
const PROXY_PORT = 2376;
const PROXY_ENDPOINT = `http://127.0.0.1:${PROXY_PORT}/docker`;

/**
 * Bot client connects to Docker proxy server.
 */
// TODO(burdon): Factor out.
export class BotClient {
  public readonly onStatusUpdate = new Event<string>();

  constructor(private readonly _space: Space) {}

  // TODO(burdon): Error handling.
  async getBots(): Promise<any> {
    // https://docs.docker.com/engine/api/v1.42/
    return fetch(`${PROXY_ENDPOINT}/containers/json?all=true`).then((r) => r.json());
  }

  async startBot(botId: string) {
    log.info('creating container', { bot: botId });
    this.onStatusUpdate.emit('Creating container...');

    const env = {
      LOG_FILTER: 'info',
      BOT_NAME: botId,
      PROTONMAIL_HOST: 'host.docker.internal',
      // TODO(burdon): From credentials (these are local only).
      PROTONMAIL_USERNAME: 'rich@dxos.org',
      PROTONMAIL_PASSWORD: '2ZdkbJKZVikacL8Ch0vLaA'
    };

    const botInstanceId = 'bot-' + PublicKey.random().toHex().slice(0, 8);
    const port = Math.floor(Math.random() * 1000) + 3000;
    const response = await fetch(`${PROXY_ENDPOINT}/containers/create?name=${botInstanceId}`, {
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
        Env: Object.entries(env).map(([key, value]) => `${key}=${String(value)}`),
        Labels: {
          'dxos.bot': `${true}`,
          'dxos.bot.dxrpc-port': `${port}`,
          'dxos.bot.name': botId
        }
      })
    });

    const data = await response.json();
    this.onStatusUpdate.emit('Starting bot container...');
    await fetch(`${PROXY_ENDPOINT}/containers/${data.Id}/start`, {
      method: 'POST'
    });

    // TODO(burdon): Configure port.
    // Poll proxy until container starts.
    // const botEndpoint = `127.0.0.1:${port}`;
    const botEndpoint = `localhost:2376/proxy/${port}`;
    while (true) {
      try {
        await fetch(`http://${botEndpoint}`);
        break;
      } catch (err: any) {
        log.error(err);
      }
      await sleep(500);
    }

    this.onStatusUpdate.emit('Connecting to bot...');
    const botClient = new Client({ services: fromRemote(`ws://${botEndpoint}`) });
    await botClient.initialize();
    log('status', await botClient.getStatus());

    this.onStatusUpdate.emit('Initializing bot...');
    await botClient.halo.createIdentity({ displayName: botInstanceId });

    this.onStatusUpdate.emit('Joining space...');
    log('joining', { space: this._space.key });
    await this.inviteBotToSpace(botClient);

    this.onStatusUpdate.emit('Connected');
  }

  private async inviteBotToSpace(botClient: Client) {
    const connected = new Trigger();
    const invitation = this._space.createInvitation({
      authMethod: AuthMethod.NONE
    });

    invitation.subscribe({
      onConnecting: async (invitation1) => {
        log('invitation1', invitation1);
        const observable2 = botClient.echo.acceptInvitation(invitation1);
        observable2.subscribe({
          onSuccess: async () => {
            connected.wake();
          },
          onCancelled: () => console.error(new Error('cancelled')),
          onTimeout: (err: Error) => console.error(new Error(err.message)),
          onError: (err: Error) => console.error(new Error(err.message))
        });
      },
      onConnected: async () => {
        log('connected');
      },
      onSuccess: async () => {
        log('success');
      },
      onCancelled: () => console.error(new Error('cancelled')),
      onTimeout: (err: Error) => console.error(new Error(err.message)),
      onError: (err: Error) => console.error(new Error(err.message))
    });

    await connected.wait();
  }
}

/**
 * Proxied access to remove Bot client.
 */
const fromRemote = (url: string): ClientServicesProvider => {
  const dxRpcClient = new WebsocketRpcClient({
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
      return dxRpcClient.rpc;
    },

    open: () => dxRpcClient.open(),
    close: () => dxRpcClient.close()
  };
};
