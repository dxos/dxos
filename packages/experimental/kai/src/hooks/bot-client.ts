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

// TODO(burdon): Copied from @dxos/bot-lab.
export const DX_BOT_SERVICE_PORT = 7100;
export const DX_BOT_RPC_PORT_MIN = 7200;
export const DX_BOT_RPC_PORT_MAX = 7300;
export const DX_BOT_CONTAINER_RPC_PORT = 7400;

export type BotClientOptions = {
  proxy?: string;
};

/**
 * Bot client connects to Docker proxy server.
 */
// TODO(burdon): Factor out (e.g., @dxos/bot-client or generic kube service?)
export class BotClient {
  public readonly onStatusUpdate = new Event<string>();

  private readonly _botServiceEndpoint: string;

  // prettier-ignoreå
  constructor(
    private readonly _config: Config,
    private readonly _space: Space,
    options: BotClientOptions = {
      proxy: `http://127.0.0.1:${DX_BOT_SERVICE_PORT}`
    }
  ) {
    this._botServiceEndpoint = this._config.values.runtime?.services?.bot?.proxy ?? options.proxy!;
  }

  // TODO(burdon): Error handling.
  async getBots(): Promise<any> {
    // https://docs.docker.com/engine/api/v1.42/
    return fetch(`${this._botServiceEndpoint}/containers/json?all=true`).then((response) => {
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
    // TODO(burdon): How is this different from BOT_PORT?
    const port = DX_BOT_RPC_PORT_MIN + Math.floor(Math.random() * (DX_BOT_RPC_PORT_MAX - DX_BOT_RPC_PORT_MIN));

    const botInstanceId = 'bot-' + PublicKey.random().toHex().slice(0, 8);

    const request = {
      Image: 'bot-test', // TODO(burdon): Factor out name?
      ExposedPorts: {
        [`${DX_BOT_CONTAINER_RPC_PORT}/tcp`]: {}
      },
      HostConfig: {
        PortBindings: {
          [`${DX_BOT_CONTAINER_RPC_PORT}/tcp`]: [
            {
              HostPort: `${port}`
            }
          ]
        }
      },
      Env: Object.entries(env).map(([key, value]) => `${key}=${String(value)}`),
      Labels: {
        'dxos.bot': `${true}`, // TODO(burdon): ?
        'dxos.bot.rpc.port': `${port}`,
        'dxos.bot.name': botId
      }
    };

    log.info('registering bot', { request });
    const response = await fetch(`${this._botServiceEndpoint}/docker/containers/create?name=${botInstanceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    const data = await response.json();
    this.onStatusUpdate.emit('Starting bot container...');
    await fetch(`${this._botServiceEndpoint}/docker/containers/${data.Id}/start`, {
      method: 'POST'
    });

    // TODO(burdon): Backoff and stop after max retries.
    // Poll proxy until container starts.
    const botEndpoint = `${this._botServiceEndpoint}/proxy/${port}`;
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
