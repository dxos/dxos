//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Trigger } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';
import { InvalidInvitationExtensionRoleError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema, trace } from '@dxos/protocols';
import {
  AdmissionRequest,
  AdmissionResponse,
  AuthenticationRequest,
  AuthenticationResponse,
  IntroductionRequest,
  IntroductionResponse,
  InvitationHostService,
  Options,
} from '@dxos/protocols/proto/dxos/halo/invitations';
import { ExtensionContext, RpcExtension } from '@dxos/teleport';

/// Timeout for the options exchange.
const OPTIONS_TIMEOUT = 10_000;

type InvitationHostExtensionCallbacks = {
  // Deliberately not async to not block the extensions opening.
  onOpen: () => void;
  onError: (error: Error) => void;

  introduce: (request: IntroductionRequest) => Promise<IntroductionResponse>;
  authenticate: (request: AuthenticationRequest) => Promise<AuthenticationResponse>;
  admit: (request: AdmissionRequest) => Promise<AdmissionResponse>;
};

/**
 * Host's side for a connection to a concrete peer in p2p network during invitation.
 */
export class InvitationHostExtension extends RpcExtension<
  { InvitationHostService: InvitationHostService },
  { InvitationHostService: InvitationHostService }
> {
  /**
   * @internal
   */
  private _ctx = new Context();
  private _remoteOptions?: Options;
  private _remoteOptionsTrigger = new Trigger();

  constructor(private readonly _callbacks: InvitationHostExtensionCallbacks) {
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
      // TODO(dmaretskyi): For now this is just forwarding the data to callbacks since we don't have session-specific logic.
      // Perhaps in the future we will have more complex logic here.
      InvitationHostService: {
        options: async (options) => {
          assert(!this._remoteOptions, 'Remote options already set.');
          this._remoteOptions = options;
          this._remoteOptionsTrigger.wake();
        },

        introduce: async (request) => {
          const traceId = PublicKey.random().toHex();
          log.trace('dxos.sdk.invitation-handler.host.introduce', trace.begin({ id: traceId }));
          const response = await this._callbacks.introduce(request);
          log.trace('dxos.sdk.invitation-handler.host.introduce', trace.end({ id: traceId }));
          return response;
        },

        authenticate: async (request) => {
          const traceId = PublicKey.random().toHex();
          log.trace('dxos.sdk.invitation-handler.host.authenticate', trace.begin({ id: traceId }));
          const response = await this._callbacks.authenticate(request);
          log.trace('dxos.sdk.invitation-handler.host.authenticate', trace.end({ id: traceId, data: { ...response } }));
          return response;
        },

        admit: async (request) => {
          const traceId = PublicKey.random().toHex();
          log.trace('dxos.sdk.invitation-handler.host.admit', trace.begin({ id: traceId }));
          const response = await this._callbacks.admit(request);
          log.trace('dxos.sdk.invitation-handler.host.admit', trace.end({ id: traceId }));
          return response;
        },
      },
    };
  }

  override async onOpen(context: ExtensionContext) {
    await super.onOpen(context);

    try {
      await this.rpc.InvitationHostService.options({ role: Options.Role.HOST });
      await cancelWithContext(this._ctx, this._remoteOptionsTrigger.wait({ timeout: OPTIONS_TIMEOUT }));
      if (this._remoteOptions?.role !== Options.Role.GUEST) {
        throw new InvalidInvitationExtensionRoleError(undefined, {
          expected: Options.Role.GUEST,
          remoteOptions: this._remoteOptions,
        });
      }

      this._callbacks.onOpen();
    } catch (err: any) {
      this._callbacks.onError(err);
    }
  }

  override async onClose() {
    await this._ctx.dispose();
  }
}

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

  constructor(private readonly _callbacks: InvitationGuestExtensionCallbacks) {
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
          assert(!this._remoteOptions, 'Remote options already set.');
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
      await cancelWithContext(this._ctx, this.rpc.InvitationHostService.options({ role: Options.Role.GUEST }));
      await cancelWithContext(this._ctx, this._remoteOptionsTrigger.wait({ timeout: OPTIONS_TIMEOUT }));
      log('end options');
      if (this._remoteOptions?.role !== Options.Role.HOST) {
        throw new InvalidInvitationExtensionRoleError(undefined, {
          expected: Options.Role.HOST,
          remoteOptions: this._remoteOptions,
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
    await this._ctx.dispose();
  }
}
