//
// Copyright 2023 DXOS.org
//

import { Event, Trigger } from '@dxos/async';
import { clientServiceBundle } from '@dxos/client-protocol';
import { log } from '@dxos/log';
import { Client, ClientServicesProvider, Config, PublicKey } from '@dxos/react-client';
import { Space } from '@dxos/react-client/echo';
import { Invitation } from '@dxos/react-client/invitations';
import { exponentialBackoffInterval } from '@dxos/util';
import { WebsocketRpcClient } from '@dxos/websocket-rpc';

// TODO(burdon): Factor out to separate package.

// TODO(burdon): Copied from @dxos/kai-bots
export const DX_BOT_SERVICE_PORT = 7100;
export const DX_BOT_CONTAINER_RPC_PORT = 7400;

// Proxying ports is only required on non-Linux docker platforms.
export const DX_BOT_RPC_PORT_MIN = 7200;
export const DX_BOT_RPC_PORT_MAX = 7300;

export const BOT_STARTUP_CHECK_INTERVAL = 250;
export const BOT_STARTUP_CHECK_TIMEOUT = 10_000;

// TODO(burdon): Registry.
const BOT_IMAGE = 'ghcr.io/dxos/bot:latest';

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

  constructor(
    private readonly _config: Config,
    private readonly _space: Space,
    options: BotClientOptions = {
      proxy: `http://127.0.0.1:${DX_BOT_SERVICE_PORT}`,
    },
  ) {
    this._botServiceEndpoint = this._config.values.runtime?.services?.bot?.proxy ?? options.proxy!;
  }

  // TODO(burdon): Access control.
  // TODO(burdon): Error handling.

  get active() {
    return !!this._botServiceEndpoint;
  }

  async getBots(): Promise<any[]> {
    // https://docs.docker.com/engine/api/v1.42/#tag/Container/operation/ContainerList
    return fetch(`${this._botServiceEndpoint}/docker/containers/json?all=true`).then(async (response) => {
      const records = (await response.json()) as any[];
      return records.filter((record) => {
        return record.Image === BOT_IMAGE;
      });
    });
  }

  async flushBots(): Promise<void> {
    const containers = await this.getBots();
    for (const { Id } of containers) {
      // https://docs.docker.com/engine/api/v1.42/#tag/Container/operation/ContainerDelete
      await fetch(`${this._botServiceEndpoint}/docker/containers/${Id}`, { method: 'DELETE' });
    }
  }

  async stopBots(): Promise<void> {
    const containers = await this.getBots();
    for (const { Id } of containers) {
      // https://docs.docker.com/engine/api/v1.42/#tag/Container/operation/ContainerStop
      await fetch(`${this._botServiceEndpoint}/docker/containers/${Id}/stop`, { method: 'POST' });
    }
  }

  async stopBot(id: string) {
    // https://docs.docker.com/engine/api/v1.42/#tag/Container/operation/ContainerStop
    await fetch(`${this._botServiceEndpoint}/docker/containers/${id}/stop`, { method: 'POST' });
  }

  /**
   * Fetch latest image.
   */
  async fetchImage() {
    await fetch(`${this._botServiceEndpoint}/docker/images/create?fromImage=${BOT_IMAGE}`, {
      method: 'POST',
      body: JSON.stringify({}), // Empty body required.
    });
  }

  /**
   * Start bot container.
   */
  async startBot(botName: string, envMap?: Map<string, string>) {
    log('starting bot', { bot: botName });
    this.onStatusUpdate.emit('Connecting...');

    const botInstanceId = botName.split('.').slice(-1) + '-bot-' + PublicKey.random().toHex().slice(0, 8);

    // TODO(burdon): Select free port (may clash with other clients).
    const proxyPort = DX_BOT_RPC_PORT_MIN + Math.floor(Math.random() * (DX_BOT_RPC_PORT_MAX - DX_BOT_RPC_PORT_MIN));

    // ENV variables passed to container.
    const envs = Array.from(envMap?.entries() ?? []).reduce<{ [key: string]: string }>(
      (envs, [key, value]) => {
        envs[key] = value;
        return envs;
      },
      {
        LOG_FILTER: 'info',
        DX_BOT_NAME: botName,
        // Access container directly.
        COM_PROTONMAIL_HOST: 'protonmail-bridge',
        COM_PROTONMAIL_PORT: '143',
        // COM_PROTONMAIL_HOST: 'host.docker.internal' // NOTE: Docker Desktop only (for development).
      },
    );

    // https://docs.docker.com/engine/api/v1.42/#tag/Container/operation/ContainerCreate
    const request = {
      Image: BOT_IMAGE,
      HostConfig: {
        PortBindings: {
          // Allows client to initiate connection.
          [`${DX_BOT_CONTAINER_RPC_PORT}/tcp`]: [
            {
              HostAddr: '127.0.0.1', // Only expose on loop-back interface.
              HostPort: `${proxyPort}`,
            },
          ],
        },

        // Use host's network
        // https://docs.docker.com/network/host
        // NetworkMode: 'host'

        // Maps the named container's name to the container IP address.
        // TODO(burdon): Generalize links to other containers (e.g., Protonmail bridge.)
        Links: ['protonmail-bridge:protonmail-bridge'],
      },
      ExposedPorts: {
        [`${DX_BOT_CONTAINER_RPC_PORT}/tcp`]: {},
      },
      Env: Object.entries(envs).map(([key, value]) => `${key}=${String(value)}`),
      Labels: {
        'dxos.bot.name': botName,
        'dxos.kube.proxy': `/rpc:${DX_BOT_CONTAINER_RPC_PORT}`,
      },
    };

    log('creating bot', { request, botInstanceId });
    const response = await fetch(`${this._botServiceEndpoint}/docker/containers/create?name=${botInstanceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    const { Id: containerId } = await response.json();

    this.onStatusUpdate.emit('starting container...');
    // https://docs.docker.com/engine/api/v1.42/#tag/Container/operation/ContainerStart
    await fetch(`${this._botServiceEndpoint}/docker/containers/${containerId}/start`, {
      method: 'POST',
      body: JSON.stringify({}), // Empty body required.
    });

    // Poll proxy until container starts.
    const { protocol } = new URL(this._botServiceEndpoint);
    const fetchUrl = new URL(`${containerId}/rpc`, `${this._botServiceEndpoint}/`);
    const wsUrl = new URL(`${containerId}/rpc`, `${this._botServiceEndpoint}/`);
    wsUrl.protocol = protocol === 'https:' ? 'wss:' : 'ws:';

    const done = new Trigger();
    const clear = exponentialBackoffInterval(async () => {
      try {
        const res = await fetch(fetchUrl);
        if (res.status >= 400 && res.status !== 426) {
          // 426 Upgrade Required
          return;
        }
        log('connected', { fetchUrl });
        done.wake();
      } catch (err: any) {
        log.error('connection', err);
      }
    }, BOT_STARTUP_CHECK_INTERVAL);

    try {
      await done.wait({ timeout: BOT_STARTUP_CHECK_TIMEOUT });
    } finally {
      clear();
    }

    this.onStatusUpdate.emit('Connecting to bot...');
    const botClient = new Client({ services: fromRemote(wsUrl.href) });
    await botClient.initialize();
    log('status', await botClient.status.get());

    this.onStatusUpdate.emit('Initializing bot...');
    await botClient.halo.createIdentity({ displayName: botInstanceId });

    this.onStatusUpdate.emit('Joining space...');
    log('joining', { space: this._space.key });
    await this.inviteBotToSpace(botClient);

    this.onStatusUpdate.emit('Connected');
    log('ok');
  }

  private async inviteBotToSpace(botClient: Client) {
    const connected = new Trigger();
    const invitation = this._space.share({
      authMethod: Invitation.AuthMethod.NONE,
    });

    invitation.subscribe(
      (invitation1) => {
        switch (invitation1.state) {
          case Invitation.State.CONNECTING: {
            log('invitation1', invitation1);
            const observable2 = botClient.spaces.join(invitation1);
            observable2.subscribe(
              (invitation2) => {
                switch (invitation2.state) {
                  case Invitation.State.SUCCESS: {
                    connected.wake();
                    break;
                  }

                  case Invitation.State.CANCELLED: {
                    console.error(new Error('cancelled'));
                    break;
                  }
                }
              },
              (err: Error) => console.error(new Error(err.message)),
            );
            break;
          }

          case Invitation.State.CONNECTED: {
            log('connected');
            break;
          }

          case Invitation.State.SUCCESS: {
            log('success');
            break;
          }

          case Invitation.State.CANCELLED: {
            console.error(new Error('cancelled'));
            break;
          }
        }
      },
      (err: Error) => console.error(new Error(err.message)),
    );

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
    handlers: {},
  });

  return {
    get descriptors() {
      return clientServiceBundle;
    },

    get services() {
      return dxRpcClient.rpc;
    },

    open: () => dxRpcClient.open(),
    close: () => dxRpcClient.close(),
  };
};
