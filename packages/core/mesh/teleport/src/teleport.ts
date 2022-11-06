//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { EventSubscriptions, promiseTimeout, repeatTask } from '@dxos/async';
import { scheduleTask } from '@dxos/async/src';
import { failUndefined, todo } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { ControlService } from '@dxos/protocols/dist/src/proto/gen/dxos/mesh/teleport/control';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { Callback } from '@dxos/util';

import { CreateChannelOpts, Muxer, RpcPort } from './muxing';

export type TeleportParams = {
  localPeerId: PublicKey;
  remotePeerId: PublicKey;
};

export class Teleport {
  public readonly localPeerId: PublicKey;
  public readonly remotePeerId: PublicKey;

  private readonly _muxer = new Muxer();
  private readonly _control = new ControlExtension({
    heartbeatInterval: 3000,
    heartbeatTimeout: 3000
  });

  private readonly _extensions = new Map<string, TeleportExtension>();
  private readonly _remoteExtensions = new Set<string>();

  constructor({ localPeerId, remotePeerId }: TeleportParams) {
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

  get stream(): NodeJS.ReadWriteStream {
    return this._muxer.stream;
  }

  /**
   * Blocks until the handshake is complete.
   */
  async open() {
    this._setExtension('dxos.mesh.teleport.control', this._control);
    await this._openExtension('dxos.mesh.teleport.control');
  }

  async close(err?: Error) {
    // TODO(dmaretskyi): Try soft close.

    await this.destroy(err);
  }

  async destroy(err?: Error) {
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
    log('addExtension', { name });
    this._setExtension(name, extension);

    // Perform the registration in a separate tick as this might block while the remote side is opening the extension.
    scheduleTask(async () => {
      try {
        await this._control.registerExtension(name);
      } catch (err: any) {
        await this.destroy(err);
      }
    });

    if (this._remoteExtensions.has(name)) {
      // Open the extension in a separate tick.
      scheduleTask(async () => {
        try {
          await this._openExtension(name);
        } catch (err: any) {
          await this.destroy(err);
        }
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
      close: () => {
        todo();
      }
    };

    await extension.onOpen(context);
  }
}

export type ExtensionContext = {
  localPeerId: PublicKey;
  remotePeerId: PublicKey;
  createStream(tag: string, opts?: CreateChannelOpts): NodeJS.ReadWriteStream;
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
  private _context!: ExtensionContext;
  private _rpc!: ProtoRpcPeer<{ Control: ControlService }>;
  private readonly _subscriptions = new EventSubscriptions();

  public readonly onExtensionRegistered = new Callback<(extensionName: string) => Promise<void>>();
  public readonly onTimeout = new Callback<() => void>();

  constructor(private readonly opts: ControlExtensionOpts) {}

  async onOpen(context: ExtensionContext): Promise<void> {
    this._context = context;

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
      port: context.createPort('rpc', {
        contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"'
      })
    });

    await this._rpc.open();

    this._subscriptions.add(
      repeatTask(async () => {
        try {
          await promiseTimeout(this._rpc.rpc.Control.heartbeat(), this.opts.heartbeatTimeout);
        } catch (err: any) {
          this.onTimeout.call();
        }
      }, this.opts.heartbeatInterval)
    );
  }

  async onClose(err?: Error): Promise<void> {
    this._subscriptions.clear();
    this._rpc.close();
  }

  async registerExtension(name: string) {
    await this._rpc.rpc.Control.registerExtension({ name });
  }
}

type ControlRpcBundle = {
  Control: ControlService;
};
