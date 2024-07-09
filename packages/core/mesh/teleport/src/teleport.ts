//
// Copyright 2022 DXOS.org
//

import { type Duplex } from 'node:stream';

import { runInContextAsync, synchronized, scheduleTask, type Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { RpcClosedError, TimeoutError } from '@dxos/protocols';

import { ControlExtension } from './control-extension';
import { type CreateChannelOpts, Muxer, type MuxerStats, type RpcPort } from './muxing';

export type TeleportParams = {
  initiator: boolean;
  localPeerId: PublicKey;
  remotePeerId: PublicKey;
  controlHeartbeatInterval?: number;
  controlHeartbeatTimeout?: number;
};

const CONTROL_HEARTBEAT_INTERVAL = 10_000;
const CONTROL_HEARTBEAT_TIMEOUT = 60_000;

/**
 * TODO(burdon): Comment: what is this?
 */
export class Teleport {
  public readonly initiator: boolean;
  public readonly localPeerId: PublicKey;
  public readonly remotePeerId: PublicKey;
  public _sessionId?: PublicKey;

  private readonly _ctx = new Context({
    onError: (err) => {
      void this.destroy(err).catch(() => {
        log.error('Error during destroy', err);
      });
    },
  });

  private readonly _muxer = new Muxer();

  private readonly _control;

  private readonly _extensions = new Map<string, TeleportExtension>();
  private readonly _remoteExtensions = new Set<string>();

  private _open = false;
  private _destroying = false;
  private _aborting = false;

  public get isOpen() {
    return this._open;
  }

  constructor({ initiator, localPeerId, remotePeerId, ...rest }: TeleportParams) {
    invariant(typeof initiator === 'boolean');
    invariant(PublicKey.isPublicKey(localPeerId));
    invariant(PublicKey.isPublicKey(remotePeerId));
    this.initiator = initiator;
    this.localPeerId = localPeerId;
    this.remotePeerId = remotePeerId;

    this._control = new ControlExtension(
      {
        heartbeatInterval: rest.controlHeartbeatInterval ?? CONTROL_HEARTBEAT_INTERVAL,
        heartbeatTimeout: rest.controlHeartbeatTimeout ?? CONTROL_HEARTBEAT_TIMEOUT,
        onTimeout: () => {
          if (this._destroying || this._aborting) {
            return;
          }
          log.info('abort teleport due to onTimeout in ControlExtension');
          this.abort(new TimeoutError('control extension')).catch((err) => log.catch(err));
        },
      },
      this.localPeerId,
      this.remotePeerId,
    );

    this._control.onExtensionRegistered.set(async (name) => {
      log('remote extension', { name });
      invariant(!this._remoteExtensions.has(name), 'Remote extension already exists');
      this._remoteExtensions.add(name);

      if (this._extensions.has(name)) {
        try {
          await this._openExtension(name);
        } catch (err: any) {
          await this.destroy(err);
        }
      }
    });

    {
      // Destroy Teleport when the stream is closed.
      this._muxer.stream.on('close', async () => {
        if (this._destroying || this._aborting) {
          log('destroy teleport due to muxer stream close, skipping due to already destroying/aborting');
          return;
        }
        await this.destroy();
      });

      this._muxer.stream.on('error', async (err) => {
        await this.destroy(err);
      });
    }

    // let last: MuxerStats | undefined;
    this._muxer.statsUpdated.on((stats) => {
      log.trace('dxos.mesh.teleport.stats', {
        localPeerId,
        remotePeerId,
        bytesSent: stats.bytesSent,
        bytesSentRate: stats.bytesSentRate,
        bytesReceived: stats.bytesReceived,
        bytesReceivedRate: stats.bytesReceivedRate,
        channels: stats.channels,
      });

      // last = stats;
    });
  }

  @logInfo
  get sessionIdString(): string {
    return this._sessionId ? this._sessionId.truncate() : 'none';
  }

  get stream(): Duplex {
    return this._muxer.stream;
  }

  get stats(): Event<MuxerStats> {
    return this._muxer.statsUpdated;
  }

  /**
   * Blocks until the handshake is complete.
   */

  async open(sessionId: PublicKey = PublicKey.random()) {
    // invariant(sessionId);
    this._sessionId = sessionId;
    log('open');
    this._setExtension('dxos.mesh.teleport.control', this._control);
    await this._openExtension('dxos.mesh.teleport.control');
    this._open = true;
    this._muxer.setSessionId(sessionId);
  }

  async close(err?: Error) {
    // TODO(dmaretskyi): Try soft close.
    await this.destroy(err);
  }

  @synchronized
  async abort(err?: Error) {
    if (this._aborting || this._destroying) {
      return;
    }
    this._aborting = true;
    this._open = false;

    if (this._ctx.disposed) {
      return;
    }

    await this._ctx.dispose();

    for (const extension of this._extensions.values()) {
      try {
        await extension.onAbort(err);
      } catch (err: any) {
        log.catch(err);
      }
    }

    await this._muxer.destroy(err);
  }

  @synchronized
  // TODO(nf): analyze callers and consider abort instead
  async destroy(err?: Error) {
    if (this._destroying || this._aborting) {
      return;
    }
    log('destroying teleport...', { extensionsCount: this._extensions.size });
    this._destroying = true;
    this._open = false;

    if (this._ctx.disposed) {
      return;
    }

    await this._ctx.dispose();

    for (const extension of this._extensions.values()) {
      try {
        log('destroying extension', { name: extension.constructor.name });
        await extension.onClose(err);
        log('destroyed extension', { name: extension.constructor.name });
      } catch (err: any) {
        log.catch(err);
      }
    }

    await this._muxer.close();
    log('teleport destroyed');
  }

  addExtension(name: string, extension: TeleportExtension) {
    if (!this._open) {
      throw new Error('Not open');
    }

    log('addExtension', { name });
    this._setExtension(name, extension);

    // Perform the registration in a separate tick as this might block while the remote side is opening the extension.
    scheduleTask(this._ctx, async () => {
      try {
        await this._control.registerExtension(name);
      } catch (err) {
        if (err instanceof RpcClosedError) {
          return;
        }
        throw err;
      }
    });

    if (this._remoteExtensions.has(name)) {
      // Open the extension in a separate tick.
      scheduleTask(this._ctx, async () => {
        await this._openExtension(name);
      });
    }
  }

  private _setExtension(extensionName: string, extension: TeleportExtension) {
    invariant(!extensionName.includes('/'), 'Invalid extension name');
    invariant(!this._extensions.has(extensionName), 'Extension already exists');
    this._extensions.set(extensionName, extension);
  }

  private async _openExtension(extensionName: string) {
    log('open extension', { extensionName });
    const extension = this._extensions.get(extensionName) ?? failUndefined();

    const context: ExtensionContext = {
      initiator: this.initiator,
      localPeerId: this.localPeerId,
      remotePeerId: this.remotePeerId,
      createPort: async (channelName: string, opts?: CreateChannelOpts) => {
        invariant(!channelName.includes('/'), 'Invalid channel name');
        return this._muxer.createPort(`${extensionName}/${channelName}`, opts);
      },
      createStream: async (channelName: string, opts?: CreateChannelOpts) => {
        invariant(!channelName.includes('/'), 'Invalid channel name');
        return this._muxer.createStream(`${extensionName}/${channelName}`, opts);
      },
      close: (err) => {
        void runInContextAsync(this._ctx, async () => {
          await this.close(err);
        });
      },
    };

    await extension.onOpen(context);
    log('extension opened', { extensionName });
  }
}

export type ExtensionContext = {
  /**
   * One of the peers will be designated an initiator.
   */
  initiator: boolean;
  localPeerId: PublicKey;
  remotePeerId: PublicKey;
  createStream(tag: string, opts?: CreateChannelOpts): Promise<Duplex>;
  createPort(tag: string, opts?: CreateChannelOpts): Promise<RpcPort>;
  close(err?: Error): void;
};

export interface TeleportExtension {
  onOpen(context: ExtensionContext): Promise<void>;
  onClose(err?: Error): Promise<void>;
  onAbort(err?: Error): Promise<void>;
}
