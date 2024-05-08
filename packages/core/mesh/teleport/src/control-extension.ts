//
// Copyright 2023 DXOS.org
//

import { asyncTimeout, scheduleTaskInterval, TimeoutError as AsyncTimeoutError } from '@dxos/async';
import { Context } from '@dxos/context';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema, RpcClosedError } from '@dxos/protocols';
import { type ControlService } from '@dxos/protocols/proto/dxos/mesh/teleport/control';
import { createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';
import { Callback } from '@dxos/util';

import { type ExtensionContext, type TeleportExtension } from './teleport';

const HEARTBEAT_RTT_WARN_THRESH = 10_000;
const DEBUG_PRINT_HEARTBEAT = false; // very noisy

type ControlRpcBundle = {
  Control: ControlService;
};

type ControlExtensionOpts = {
  heartbeatInterval: number;
  heartbeatTimeout: number;
  onTimeout: (err: any) => void;
};

export class ControlExtension implements TeleportExtension {
  private readonly _ctx = new Context({
    onError: (err) => {
      this._extensionContext.close(err);
    },
  });

  public readonly onExtensionRegistered = new Callback<(extensionName: string) => void>();

  private _extensionContext!: ExtensionContext;
  private _rpc!: ProtoRpcPeer<{ Control: ControlService }>;

  constructor(
    private readonly opts: ControlExtensionOpts,
    private readonly localPeerId: PublicKey,
    private readonly remotePeerId: PublicKey,
  ) {}

  async registerExtension(name: string) {
    await this._rpc.rpc.Control.registerExtension({ name });
  }

  async onOpen(extensionContext: ExtensionContext): Promise<void> {
    this._extensionContext = extensionContext;

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
            if (DEBUG_PRINT_HEARTBEAT) {
              log('received heartbeat request', {
                ts: request.requestTimestamp,
                localPeerId: this.localPeerId.truncate(),
                remotePeerId: this.remotePeerId.truncate(),
              });
            }
            return {
              requestTimestamp: request.requestTimestamp,
            };
          },
        },
      },
      port: await extensionContext.createPort('rpc', {
        contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"',
      }),
      timeout: this.opts.heartbeatTimeout,
    });

    await this._rpc.open();

    scheduleTaskInterval(
      this._ctx,
      async () => {
        const reqTS = new Date();
        try {
          const resp = await asyncTimeout(
            this._rpc.rpc.Control.heartbeat({ requestTimestamp: reqTS }),
            this.opts.heartbeatTimeout,
          );
          const now = Date.now();
          // TODO(nf): properly instrument
          if (resp.requestTimestamp instanceof Date) {
            if (
              now - resp.requestTimestamp.getTime() >
              (HEARTBEAT_RTT_WARN_THRESH < this.opts.heartbeatTimeout
                ? HEARTBEAT_RTT_WARN_THRESH
                : this.opts.heartbeatTimeout / 2)
            ) {
              log.warn(`heartbeat RTT for Teleport > ${HEARTBEAT_RTT_WARN_THRESH / 1000}s`, {
                rtt: now - resp.requestTimestamp.getTime(),
                localPeerId: this.localPeerId.truncate(),
                remotePeerId: this.remotePeerId.truncate(),
              });
            } else {
              if (DEBUG_PRINT_HEARTBEAT) {
                log('heartbeat RTT', {
                  rtt: now - resp.requestTimestamp.getTime(),
                  localPeerId: this.localPeerId.truncate(),
                  remotePeerId: this.remotePeerId.truncate(),
                });
              }
            }
          }
        } catch (err: any) {
          const now = Date.now();
          if (err instanceof RpcClosedError) {
            // TODO: expose 'closed' event in Rpc peer to close context as soon the the peer gets closed
            log('ignoring RpcClosedError in heartbeat');
            this._extensionContext.close(err);
            return;
          }
          if (err instanceof AsyncTimeoutError) {
            log('timeout waiting for heartbeat response', { err, delay: now - reqTS.getTime() });
            this.opts.onTimeout(err);
          } else {
            log.info('other error waiting for heartbeat response', { err, delay: now - reqTS.getTime() });
            this.opts.onTimeout(err);
          }
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
