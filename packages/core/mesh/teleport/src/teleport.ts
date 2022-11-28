//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { Duplex } from 'stream';

import { asyncTimeout, repeatTask, runInContextAsync, synchronized, scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { ControlService } from '@dxos/protocols/proto/dxos/mesh/teleport/control';
import { createProtoRpcPeer, ProtoRpcPeer, RpcClosedError } from '@dxos/rpc';
import { Callback } from '@dxos/util';

import { CreateChannelOpts, Muxer, RpcPort } from './muxing';

export type TeleportParams = {
  initiator: boolean;
  localPeerId: PublicKey;
  remotePeerId: PublicKey;
};

export class Teleport {
  public readonly initiator: boolean;
  public readonly localPeerId: PublicKey;
  public readonly remotePeerId: PublicKey;

  private readonly _ctx = new Context({
    onError: (err) => {
      void this.destroy(err).catch(() => {
        log.error('Error during destroy', err);
      });
    }
  });

  private readonly _muxer = new Muxer();
  private readonly _control = new ControlExtension({
    heartbeatInterval: 3000,
    heartbeatTimeout: 3000
  });

  private readonly _extensions = new Map<string, TeleportExtension>();
  private readonly _remoteExtensions = new Set<string>();

  private _open = false;

  constructor({ initiator, localPeerId, remotePeerId }: TeleportParams) {
    assert(typeof initiator === 'boolean');
    assert(PublicKey.isPublicKey(localPeerId));
    assert(PublicKey.isPublicKey(remotePeerId));
    assert(typeof initiator === 'boolean');
    this.initiator = initiator;
    this.localPeerId = localPeerId;
    this.remotePeerId = remotePeerId;

    this._control.onExtensionRegistered.set(async (name) => {
      log('remote extension', { name });
      assert(!this._remoteExtensions.has(name), 'Remote extension already exists');
      this._remoteExtensions.add(name);

      if (this._extensions.has(name)) {
        try {
          await this._openExtension(name);
        } catch (err: any) {
          await this.destroy(err);
        }
      }
    });
  }

  get stream(): Duplex {
    return this._muxer.stream;
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
  async destroy(err?: Error) {
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

    this._muxer.destroy(err);
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
      } catch(err) {
        if(err instanceof RpcClosedError) {
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
    assert(!extensionName.includes('/'), 'Invalid extension name');
    assert(!this._extensions.has(extensionName), 'Extension already exists');
    this._extensions.set(extensionName, extension);
  }

  private async _openExtension(extensionName: string) {
    log('open extension', { extensionName });
    const extension = this._extensions.get(extensionName) ?? failUndefined();

    const context: ExtensionContext = {
      initiator: this.initiator,
      localPeerId: this.localPeerId,
      remotePeerId: this.remotePeerId,
      createPort: (channelName: string, opts?: CreateChannelOpts) => {
        assert(!channelName.includes('/'), 'Invalid channel name');
        return this._muxer.createPort(`${extensionName}/${channelName}`, opts);
      },
      createStream: (channelName: string, opts?: CreateChannelOpts) => {
        assert(!channelName.includes('/'), 'Invalid channel name');
        return this._muxer.createStream(`${extensionName}/${channelName}`, opts);
      },
      close: (err) => {
        void runInContextAsync(this._ctx, async () => {
          await this.close(err);
        });
      }
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
  createStream(tag: string, opts?: CreateChannelOpts): Duplex;
  createPort(tag: string, opts?: CreateChannelOpts): RpcPort;
  close(err?: Error): void;
};

export interface TeleportExtension {
  onOpen(context: ExtensionContext): Promise<void>;
  onClose(err?: Error): Promise<void>;
}

type ControlExtensionOpts = {
  heartbeatInterval: number;
  heartbeatTimeout: number;
};

class ControlExtension implements TeleportExtension {
  private readonly _ctx = new Context({
    onError: (err) => {
      this._extensionContext.close(err);
    }
  });

  private _extensionContext!: ExtensionContext;
  private _rpc!: ProtoRpcPeer<{ Control: ControlService }>;

  public readonly onExtensionRegistered = new Callback<(extensionName: string) => void>();
  public readonly onTimeout = new Callback<() => void>();

  constructor(private readonly opts: ControlExtensionOpts) {}

  async onOpen(extensionContext: ExtensionContext): Promise<void> {
    this._extensionContext = extensionContext;

    // NOTE: Make sure that RPC timeout is greater than the heartbeat timeout.
    // TODO(dmaretskyi): Allow overwriting the timeout on individual RPC calls?
    this._rpc = createProtoRpcPeer<ControlRpcBundle, ControlRpcBundle>({
      requested: {
        Control: schema.getService('dxos.mesh.teleport.control.ControlService')
      },
      exposed: {
        Control: schema.getService('dxos.mesh.teleport.control.ControlService')
      },
      handlers: {
        Control: {
          registerExtension: async (request) => {
            this.onExtensionRegistered.call(request.name);
          },
          heartbeat: async (request) => {
            // Ok.
          }
        }
      },
      port: extensionContext.createPort('rpc', {
        contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"'
      })
    });

    await this._rpc.open();

    repeatTask(
      this._ctx,
      async () => {
        try {
          await asyncTimeout(this._rpc.rpc.Control.heartbeat(), this.opts.heartbeatTimeout);
        } catch (err: any) {
          this.onTimeout.call();
        }
      },
      this.opts.heartbeatInterval
    );
  }

  async onClose(err?: Error): Promise<void> {
    await this._ctx.dispose();
    await this._rpc.close();
  }

  async registerExtension(name: string) {
    await this._rpc.rpc.Control.registerExtension({ name });
  }
}

type ControlRpcBundle = {
  Control: ControlService;
};
