//
// Copyright 2024 DXOS.org
//

import { type Mutex, type MutexGuard, Trigger } from '@dxos/async';
import { Context, cancelWithContext } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { InvalidInvitationExtensionRoleError, type Rpc } from '@dxos/protocols';
import { EMPTY } from '@dxos/protocols/buf';
import { type Invitation_State } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import {
  InvitationHostService,
  type InvitationOptions,
  InvitationOptions_Role,
} from '@dxos/protocols/buf/dxos/halo/invitations_pb';
import { type ExtensionContext, BufRpcExtension } from '@dxos/teleport';

import { type FlowLockHolder } from './invitation-state';
import { tryAcquireBeforeContextDisposed } from './utils';

const OPTIONS_TIMEOUT = 10_000;

type InvitationGuestExtensionCallbacks = {
  // Deliberately not async to not block the extensions opening.
  onOpen: (ctx: Context, extensionCtx: ExtensionContext) => void;
  onError: (error: Error) => void;

  onStateUpdate: (newState: Invitation_State) => void;
};

/**
 * Guest's side for a connection to a concrete peer in p2p network during invitation.
 */
type InvitationServices = { InvitationHostService: typeof InvitationHostService };

export class InvitationGuestExtension
  extends BufRpcExtension<InvitationServices, InvitationServices>
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
        InvitationHostService,
      },
      exposed: {
        InvitationHostService,
      },
    });
  }

  public hasFlowLock(): boolean {
    return this._invitationFlowLock != null;
  }

  protected override async getHandlers(): Promise<Rpc.BufServiceHandlers<InvitationServices>> {
    return {
      InvitationHostService: {
        options: async (options) => {
          invariant(!this._remoteOptions, 'Remote options already set.');
          this._remoteOptions = options;
          this._remoteOptionsTrigger.wake();
          return EMPTY;
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
        this.rpc.InvitationHostService.options({ role: InvitationOptions_Role.GUEST }),
      );
      log.verbose('options sent');
      await cancelWithContext(this._ctx, this._remoteOptionsTrigger.wait({ timeout: OPTIONS_TIMEOUT }));
      log.verbose('options received');
      if (this._remoteOptions?.role !== InvitationOptions_Role.HOST) {
        throw new InvalidInvitationExtensionRoleError({
          context: {
            expected: InvitationOptions_Role.HOST,
            remoteOptions: this._remoteOptions,
            remotePeerId: context.remotePeerId,
          },
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
