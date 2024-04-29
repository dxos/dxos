//
// Copyright 2024 DXOS.org
//

import { type Mutex, type MutexGuard, Trigger } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { InvalidInvitationExtensionRoleError, schema } from '@dxos/protocols';
import { type InvitationHostService, Options } from '@dxos/protocols/proto/dxos/halo/invitations';
import { type ExtensionContext, RpcExtension } from '@dxos/teleport';

const OPTIONS_TIMEOUT = 10_000;

type InvitationGuestExtensionCallbacks = {
  // Deliberately not async to not block the extensions opening.
  onOpen: (ctx: Context) => void;
  onError: (error: Error) => void;
};

/**
 * Guest's side for a connection to a concrete peer in p2p network during invitation.
 */
export class InvitationGuestExtension extends RpcExtension<
  { InvitationHostService: InvitationHostService },
  { InvitationHostService: InvitationHostService }
> {
  private _ctx = new Context();
  private _remoteOptions?: Options;
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

  override async onOpen(context: ExtensionContext) {
    await super.onOpen(context);

    try {
      log('begin options');
      this._invitationFlowLock = await cancelWithContext(this._ctx, this._invitationFlowMutex.acquire());
      await cancelWithContext(this._ctx, this.rpc.InvitationHostService.options({ role: Options.Role.GUEST }));
      await cancelWithContext(this._ctx, this._remoteOptionsTrigger.wait({ timeout: OPTIONS_TIMEOUT }));
      log('end options');
      if (this._remoteOptions?.role !== Options.Role.HOST) {
        throw new InvalidInvitationExtensionRoleError(undefined, {
          expected: Options.Role.HOST,
          remoteOptions: this._remoteOptions,
          remotePeerId: context.remotePeerId,
        });
      }

      this._callbacks.onOpen(this._ctx);
    } catch (err: any) {
      log('openError', err);
      this._callbacks.onError(err);
    }
  }

  override async onClose() {
    log('onClose');
    this._invitationFlowLock?.release();
    this._invitationFlowLock = null;
    await this._ctx.dispose();
  }
}
