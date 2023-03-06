//
// Copyright 2023 DXOS.org
//

import { sleep, Event, Trigger } from '@dxos/async';
import { Client, ClientServicesProvider, Space } from '@dxos/client';
import { clientServiceBundle } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { AuthMethod } from '@dxos/protocols/proto/dxos/halo/invitations';
import { WebsocketRpcClient } from '@dxos/websocket-rpc';

// TODO(burdon): Config. Standardize and document ports.
export const PROXY_PORT = 2376;
export const BOT_PORT = 3023;
export const BOT_RPC_PORT_MIN = 3100;
export const BOT_RPC_PORT_MAX = 3200;

export type BotClientOptions = {
  proxy?: string;
};

/**
 * Bot client connects to Docker proxy server.
 */
// TODO(burdon): Factor out (e.g., @dxos/bot-client or generic kube service?)
export class BotClient {
  public readonly onStatusUpdate = new Event<string>();

  private readonly _proxyEndpoint: string;

  // prettier-ignore
  constructor(
    private readonly _config: Config,
    private readonly _space: Space,
    options: BotClientOptions = {
      proxy: 'http://127.0.0.1:2376/docker'
    }
  ) {
    this._proxyEndpoint = this._config.values.runtime?.services?.bot?.proxy ?? options.proxy!;
    console.log(this._proxyEndpoint);
  }

  // TODO(burdon): Error handling.
  async getBots(): Promise<any> {
    // https://docs.docker.com/engine/api/v1.42/
    return fetch(`${this._proxyEndpoint}/containers/json?all=true`).then((response) => {
      return response.json();
    });
  }

  /**
   * Start bot container.
   */
  async startBot(botId: string, envMap?: Map<string, string>) {
    log('starting bot', { bot: botId });
    this.onStatusUpdate.emit('Connecting...');

    const env: { [key: string]: string } = {
      BOT_NAME: botId,
      LOG_FILTER: 'info',
      COM_PROTONMAIL_HOST: 'host.docker.internal'
    };

    Array.from(envMap?.entries() ?? []).forEach(([key, value]) => (env[key] = value));

    // TODO(burdon): Maintain map (for collisions).
    const port = BOT_RPC_PORT_MIN + Math.floor(Math.random() * (BOT_RPC_PORT_MAX - BOT_RPC_PORT_MIN));

    const botInstanceId = 'bot-' + PublicKey.random().toHex().slice(0, 8);

    const body = {
      Image: 'bot-test', // TODO(burdon): Factor out name.
      ExposedPorts: {
        [`${BOT_PORT}/tcp`]: {}
      },
      HostConfig: {
        PortBindings: {
          [`${BOT_PORT}/tcp`]: [
            {
              HostPort: `${port}`
            }
          ]
        }
      },
      Env: Object.entries(env).map(([key, value]) => `${key}=${String(value)}`),
      Labels: {
        'dxos.bot': `${true}`, // TODO(burdon): ?
        'dxos.bot.dxrpc-port': `${port}`,
        'dxos.bot.name': botId
      }
    };

    log.info('registering bot', { body });
    const response = await fetch(`${this._proxyEndpoint}/containers/create?name=${botInstanceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    this.onStatusUpdate.emit('Starting bot container...');
    await fetch(`${this._proxyEndpoint}/containers/${data.Id}/start`, {
      method: 'POST'
    });

    // TODO(burdon): Configure port.
    // Poll proxy until container starts.
    // const botEndpoint = `127.0.0.1:${port}`;
    const botEndpoint = `localhost:${PROXY_PORT}/proxy/${port}`;
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
