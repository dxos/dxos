//
// Copyright 2024 DXOS.org
//

import { type Mutex, type MutexGuard, Trigger } from '@dxos/async';
import { Context, cancelWithContext } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { InvalidInvitationExtensionRoleError } from '@dxos/protocols';
import { schema } from '@dxos/protocols/proto';
import { type Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type InvitationHostService, InvitationOptions } from '@dxos/protocols/proto/dxos/halo/invitations';
import { type ExtensionContext, RpcExtension } from '@dxos/teleport';

import { type FlowLockHolder } from './invitation-state';
import { tryAcquireBeforeContextDisposed } from './utils';

const OPTIONS_TIMEOUT = 10_000;

type InvitationGuestExtensionCallbacks = {
  // Deliberately not async to not block the extensions opening.
  onOpen: (ctx: Context, extensionCtx: ExtensionContext) => void;
  onError: (error: Error) => void;

  onStateUpdate: (newState: Invitation.State) => void;
};

/**
 * Guest's side for a connection to a concrete peer in p2p network during invitation.
 */
export class InvitationGuestExtension
  extends RpcExtension<
    { InvitationHostService: InvitationHostService },
    { InvitationHostService: InvitationHostService }
  >
  implements FlowLockHolder
{
  private _ctx = new Context();
  private _remoteOptions?: InvitationOptions;
  private _remoteOptionsTrigger = new Trigger();
  /**
   * Held to allow only one invitation flow at a time to be active.
   */
  private _invitationFlowLock: MutexGuard | null = null;

  constructor(
    private readonly _invitationFlowMutex: Mutex,
    private readonly _callbacks: InvitationGuestExtensionCallbacks,
  ) {
    super({
      requested: {
        InvitationHostService: schema.getService('dxos.halo.invitations.InvitationHostService'),
      },
      exposed: {
        InvitationHostService: schema.getService('dxos.halo.invitations.InvitationHostService'),
      },
    });
  }

  public hasFlowLock(): boolean {
    return this._invitationFlowLock != null;
  }

  protected override async getHandlers(): Promise<{ InvitationHostService: InvitationHostService }> {
    return {
      InvitationHostService: {
        options: async (options) => {
          invariant(!this._remoteOptions, 'Remote options already set.');
          this._remoteOptions = options;
          this._remoteOptionsTrigger.wake();
        },
        introduce: () => {
          throw new Error('Method not allowed.');
        },
        authenticate: () => {
          throw new Error('Method not allowed.');
        },
        admit: () => {
          throw new Error('Method not allowed.');
        },
      },
    };
  }

  override async onOpen(context: ExtensionContext): Promise<void> {
    await super.onOpen(context);

    try {
      log.verbose('guest acquire lock');
      this._invitationFlowLock = await tryAcquireBeforeContextDisposed(this._ctx, this._invitationFlowMutex);
      log.verbose('guest lock acquired');
      await cancelWithContext(
        this._ctx,
        this.rpc.InvitationHostService.options({ role: InvitationOptions.Role.GUEST }),
      );
      log.verbose('options sent');
      await cancelWithContext(this._ctx, this._remoteOptionsTrigger.wait({ timeout: OPTIONS_TIMEOUT }));
      log.verbose('options received');
      if (this._remoteOptions?.role !== InvitationOptions.Role.HOST) {
        throw new InvalidInvitationExtensionRoleError({ context: {
          expected: InvitationOptions.Role.HOST,
          remoteOptions: this._remoteOptions,
          remotePeerId: context.remotePeerId,
        });
      }

      this._callbacks.onOpen(this._ctx, context);
    } catch (err: any) {
      if (this._invitationFlowLock != null) {
        this._callbacks.onError(err);
      }
      if (!this._ctx.disposed) {
        context.close(err);
      }
    }
  }

  override async onClose(): Promise<void> {
    await this._destroy();
  }

  override async onAbort(): Promise<void> {
    await this._destroy();
  }

  private async _destroy(): Promise<void> {
    await this._ctx.dispose();
    if (this._invitationFlowLock != null) {
      this._invitationFlowLock.release();
      this._invitationFlowLock = null;
      log.verbose('invitation flow lock released');
    }
  }
}
