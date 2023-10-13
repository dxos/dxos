//
// Copyright 2022 DXOS.org
//

import { type Duplex } from 'node:stream';

import {
  asyncTimeout,
  scheduleTaskInterval,
  runInContextAsync,
  synchronized,
  scheduleTask,
  type Event,
} from '@dxos/async';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema, RpcClosedError, TimeoutError } from '@dxos/protocols';
import { type ControlService } from '@dxos/protocols/proto/dxos/mesh/teleport/control';
import { createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';
import { Callback } from '@dxos/util';

import { type CreateChannelOpts, Muxer, type MuxerStats, type RpcPort } from './muxing';

export type TeleportParams = {
  initiator: boolean;
  localPeerId: PublicKey;
  remotePeerId: PublicKey;
};

/**
 * TODO(burdon): Comment: what is this?
 */
export class Teleport {
  public readonly initiator: boolean;
  public readonly localPeerId: PublicKey;
  public readonly remotePeerId: PublicKey;

  private readonly _ctx = new Context({
    onError: (err) => {
      void this.destroy(err).catch(() => {
        log.error('Error during destroy', err);
      });
    },
  });

  private readonly _muxer = new Muxer();

  private readonly _control = new ControlExtension({
    heartbeatInterval: 10_000,
    heartbeatTimeout: 10_000,
    onTimeout: () => {
      if (this._destroying || this._aborting) {
        return;
      }
      // TODO(egorgripasov): Evaluate use of abort instead of destroy.
      log('destroy teleport due to onTimeout in ControlExtension');
      this.destroy(new TimeoutError('control extension')).catch((err) => log.catch(err));
    },
  });

  private readonly _extensions = new Map<string, TeleportExtension>();
  private readonly _remoteExtensions = new Set<string>();

  private _open = false;
  private _destroying = false;
  private _aborting = false;

  constructor({ initiator, localPeerId, remotePeerId }: TeleportParams) {
    invariant(typeof initiator === 'boolean');
    invariant(PublicKey.isPublicKey(localPeerId));
    invariant(PublicKey.isPublicKey(remotePeerId));
    this.initiator = initiator;
    this.localPeerId = localPeerId;
    this.remotePeerId = remotePeerId;

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

  get stream(): Duplex {
    return this._muxer.stream;
  }

  get stats(): Event<MuxerStats> {
    return this._muxer.statsUpdated;
  }

  /**
   * Blocks until the handshake is complete.
   */
  async open() {
    this._setExtension('dxos.mesh.teleport.control', this._control);
    await this._openExtension('dxos.mesh.teleport.control');
    this._open = true;
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
    this._destroying = true;
    if (this._ctx.disposed) {
      return;
    }

    await this._ctx.dispose();

    for (const extension of this._extensions.values()) {
      try {
        await extension.onClose(err);
      } catch (err: any) {
        log.catch(err);
      }
    }

    await this._muxer.destroy(err);
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

type ControlRpcBundle = {
  Control: ControlService;
};

type ControlExtensionOpts = {
  heartbeatInterval: number;
  heartbeatTimeout: number;
  onTimeout: () => void;
};

class ControlExtension implements TeleportExtension {
  private readonly _ctx = new Context({
    onError: (err) => {
      this._extensionContext.close(err);
    },
  });

  public readonly onExtensionRegistered = new Callback<(extensionName: string) => void>();

  private _extensionContext!: ExtensionContext;
  private _rpc!: ProtoRpcPeer<{ Control: ControlService }>;

  constructor(private readonly opts: ControlExtensionOpts) {}

  async registerExtension(name: string) {
    await this._rpc.rpc.Control.registerExtension({ name });
  }

  async onOpen(extensionContext: ExtensionContext): Promise<void> {
    this._extensionContext = extensionContext;

    // NOTE: Make sure that RPC timeout is greater than the heartbeat timeout.
    // TODO(dmaretskyi): Allow overwriting the timeout on individual RPC calls?
    this._rpc = createProtoRpcPeer<ControlRpcBundle, ControlRpcBundle>({
      requested: {
        Control: schema.getService('dxos.mesh.teleport.control.ControlService'),
      },
      exposed: {
        Control: schema.getService('dxos.mesh.teleport.control.ControlService'),
      },
      handlers: {
        Control: {
          registerExtension: async (request) => {
            this.onExtensionRegistered.call(request.name);
          },
          heartbeat: async (request) => {
            // Ok.
          },
        },
      },
      port: await extensionContext.createPort('rpc', {
        contentType: 'application/x-protobuf; messagType="dxos.rpc.Message"',
      }),
    });

    await this._rpc.open();

    scheduleTaskInterval(
      this._ctx,
      async () => {
        try {
          await asyncTimeout(this._rpc.rpc.Control.heartbeat(), this.opts.heartbeatTimeout);
        } catch (err: any) {
          this.opts.onTimeout();
        }
      },
      this.opts.heartbeatInterval,
    );
  }

  async onClose(err?: Error): Promise<void> {
    await this._ctx.dispose();
    await this._rpc.close();
  }

  async onAbort(err?: Error | undefined): Promise<void> {
    await this._ctx.dispose();
    await this._rpc.abort();
  }
}
