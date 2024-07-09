//
// Copyright 2023 DXOS.org
//

import { Trigger, sleep } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError, schema } from '@dxos/protocols';
import {
  type PeerInfo,
  type AutomergeReplicatorService,
  type SyncMessage,
} from '@dxos/protocols/proto/dxos/mesh/teleport/automerge';
import { createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';
import { type ExtensionContext, type TeleportExtension } from '@dxos/teleport';

export type AutomergeReplicatorParams = {
  /**
   * The peerId of local automerge repo.
   */
  peerId: string;
  sendSyncRetryPolicy?: {
    retriesBeforeBackoff: number;
    retryBackoff: number;
    maxRetries: number;
  };
};

export type AutomergeReplicatorCallbacks = {
  /**
   * Callback to be called when remote peer starts replication.
   */
  onStartReplication?: (info: PeerInfo, remotePeerId: PublicKey) => Promise<void>;

  /**
   * Callback to be called when a sync message is received.
   */
  onSyncMessage?: (message: SyncMessage) => Promise<void>;

  /**
   * Callback to be called when the extension is closed.
   */
  onClose?: (err?: Error) => Promise<void>;
};

const RPC_TIMEOUT = 10_000;

const DEFAULT_RETRY_POLICY: NonNullable<AutomergeReplicatorParams['sendSyncRetryPolicy']> = {
  retriesBeforeBackoff: 3,
  retryBackoff: 1_000,
  maxRetries: 10,
};

export type AutomergeReplicatorFactory = (
  params: ConstructorParameters<typeof AutomergeReplicator>,
) => AutomergeReplicator;

/**
 * Sends automerge messages between two peers for a single teleport session.
 */
export class AutomergeReplicator implements TeleportExtension {
  private readonly _opened = new Trigger();
  private _rpc?: ProtoRpcPeer<ServiceBundle>;

  private _destroyed: boolean = false;
  private _extensionContext?: ExtensionContext;

  constructor(
    private readonly _params: AutomergeReplicatorParams,
    private readonly _callbacks: AutomergeReplicatorCallbacks = {},
  ) {}

  async onOpen(context: ExtensionContext): Promise<void> {
    log('onOpen', { localPeerId: context.localPeerId, remotePeerId: context.remotePeerId });
    this._extensionContext = context;
    this._rpc = createProtoRpcPeer<ServiceBundle, ServiceBundle>({
      timeout: RPC_TIMEOUT,
      requested: {
        AutomergeReplicatorService: schema.getService('dxos.mesh.teleport.automerge.AutomergeReplicatorService'),
      },
      exposed: {
        AutomergeReplicatorService: schema.getService('dxos.mesh.teleport.automerge.AutomergeReplicatorService'),
      },
      handlers: {
        AutomergeReplicatorService: {
          startReplication: async (info: PeerInfo): Promise<void> => {
            log('startReplication', { localPeerId: context.localPeerId, remotePeerId: context.remotePeerId, info });
            await this._callbacks.onStartReplication?.(info, context.remotePeerId);
          },
          sendSyncMessage: async (message: SyncMessage): Promise<void> => {
            log('sendSyncMessage', { localPeerId: context.localPeerId, remotePeerId: context.remotePeerId, message });
            await this._callbacks.onSyncMessage?.(message);
          },
        },
      },
      port: await context.createPort('rpc', { contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"' }),
    });
    await this._rpc.open();
    // Announce to remote peer that we are ready to start replication.
    await this._rpc.rpc.AutomergeReplicatorService.startReplication({ id: this._params.peerId });
    this._opened.wake();
  }

  async onClose(err?: Error): Promise<void> {
    await this._rpc?.close();
    await this._destroy(err);
  }

  async onAbort(err?: Error): Promise<void> {
    log('abort', { err });
    await this._rpc?.abort();
    await this._destroy(err);
  }

  private async _destroy(err?: Error) {
    this._destroyed = true;
    this._rpc = undefined;
    this._extensionContext = undefined;
    await this._callbacks.onClose?.(err);
  }

  async sendSyncMessage(message: SyncMessage) {
    invariant(!this._destroyed);
    await this._opened.wait();
    invariant(this._rpc, 'RPC not initialized');

    const retryPolicy = this._params.sendSyncRetryPolicy ?? DEFAULT_RETRY_POLICY;
    let retries = 0;
    while (true) {
      try {
        await this._rpc.rpc.AutomergeReplicatorService.sendSyncMessage(message);
        break;
      } catch (err) {
        if (err instanceof RpcClosedError) {
          return;
        }

        log('sendSyncMessage error', { err });

        retries++;
        if (retries >= retryPolicy.maxRetries) {
          const numberOfRetriesExceededError = new Error(
            `Failed to send sync message after ${retryPolicy.maxRetries} retries. Last attempt failed with error: ${err}`,
          );
          this._extensionContext?.close(numberOfRetriesExceededError);
          throw numberOfRetriesExceededError;
        }
        if (retries % retryPolicy.retriesBeforeBackoff === 0) {
          await sleep(retryPolicy.retryBackoff);
        }
      }
    }
  }
}

type ServiceBundle = {
  AutomergeReplicatorService: AutomergeReplicatorService;
};
