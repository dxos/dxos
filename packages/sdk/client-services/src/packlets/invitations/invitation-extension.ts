//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { PushStream, scheduleTask, sleep, TimeoutError, Trigger } from '@dxos/async';
import {
  AUTHENTICATION_CODE_LENGTH,
  CancellableInvitationObservable,
  INVITATION_TIMEOUT,
  ON_CLOSE_DELAY,
  AuthenticatingInvitationObservable
} from '@dxos/client';
import { Context } from '@dxos/context';
import { generatePasscode } from '@dxos/credentials';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createTeleportProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { schema, trace } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import {
  AuthenticationRequest,
  AuthenticationResponse,
  IntroductionRequest,
  IntroductionResponse,
  AdmissionRequest,
  AdmissionResponse,
  InvitationHostService
} from '@dxos/protocols/proto/dxos/halo/invitations';
import { ExtensionContext, RpcExtension } from '@dxos/teleport';

import { InvitationProtocol } from './invitation-protocol';

type InvitationHostExtensionCallbacks = {
  // Deliberately not async to not block the extensions opening.
  onOpen: () => void;

  introduce: (request: IntroductionRequest) => Promise<IntroductionResponse>;
  authenticate: (request: AuthenticationRequest) => Promise<AuthenticationResponse>;
  admit: (request: AdmissionRequest) => Promise<AdmissionResponse>;
};

/**
 * Host's side for a connection to a concrete peer in p2p network during invitation.
 */
export class InvitationHostExtension extends RpcExtension<{}, { InvitationHostService: InvitationHostService }> {
  /**
   * @internal
   */
  public _traceParent?: string;

  constructor(private readonly _callbacks: InvitationHostExtensionCallbacks) {
    super({
      exposed: {
        InvitationHostService: schema.getService('dxos.halo.invitations.InvitationHostService')
      }
    });
  }

  protected override async getHandlers(): Promise<{ InvitationHostService: InvitationHostService }> {
    return {
      // TODO(dmaretskyi): For now this is just forwarding the data to callbacks since we don't have session-specific logic.
      // Perhaps in the future we will have more complex logic here.
      InvitationHostService: {
        introduce: async (request) => {
          const traceId = PublicKey.random().toHex();
          log.trace(
            'dxos.sdk.invitation-handler.host.introduce',
            trace.begin({ id: traceId, parentId: this._traceParent })
          );
          const response = await this._callbacks.introduce(request);
          log.trace('dxos.sdk.invitation-handler.host.introduce', trace.end({ id: traceId }));
          return response;
        },

        authenticate: async (request) => {
          const traceId = PublicKey.random().toHex();
          log.trace(
            'dxos.sdk.invitation-handler.host.authenticate',
            trace.begin({ id: traceId, parentId: this._traceParent })
          );
          const response = await this._callbacks.authenticate(request);
          log.trace('dxos.sdk.invitation-handler.host.authenticate', trace.end({ id: traceId, data: { ...response } }));
          return response;
        },

        admit: async (request) => {
          const traceId = PublicKey.random().toHex();
          log.trace(
            'dxos.sdk.invitation-handler.host.admit',
            trace.begin({ id: traceId, parentId: this._traceParent })
          );
          const response = await this._callbacks.admit(request);
          log.trace('dxos.sdk.invitation-handler.host.admit', trace.end({ id: traceId }));
          return response;
        }
      }
    };
  }

  override async onOpen(context: ExtensionContext) {
    await super.onOpen(context);
    this._callbacks.onOpen();
  }
}

type InvitationGuestExtensionCallbacks = {
  // Deliberately not async to not block the extensions opening.
  onOpen: () => void;
};

/**
 * Guest's side for a connection to a concrete peer in p2p network during invitation.
 */
export class InvitationGuestExtension extends RpcExtension<{ InvitationHostService: InvitationHostService }, {}> {
  constructor(private readonly _callbacks: InvitationGuestExtensionCallbacks) {
    super({
      requested: {
        InvitationHostService: schema.getService('dxos.halo.invitations.InvitationHostService')
      }
    });
  }

  protected override async getHandlers() {
    return {};
  }

  override async onOpen(context: ExtensionContext) {
    await super.onOpen(context);
    this._callbacks.onOpen();
  }
}
