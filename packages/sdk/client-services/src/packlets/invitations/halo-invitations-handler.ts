//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { scheduleTask, sleep, Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { generatePasscode } from '@dxos/credentials';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createTeleportProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { schema } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import {
  AuthenticationRequest,
  AuthenticationResponse,
  HaloAdmissionCredentials,
  HaloAdmissionOffer,
  HaloHostService
} from '@dxos/protocols/proto/dxos/halo/invitations';
import { ExtensionContext, RpcExtension } from '@dxos/teleport';

import { Identity, JoinIdentityParams } from '../identity';
import {
  AuthenticatingInvitationProvider,
  AUTHENTICATION_CODE_LENGTH,
  CancellableInvitationObservable,
  InvitationObservableProvider,
  INVITATION_TIMEOUT,
  ON_CLOSE_DELAY
} from './invitations';
import { AbstractInvitationsHandler, InvitationsOptions } from './invitations-handler';

type HaloInvitationsHandlerParams = {
  networkManager: NetworkManager;
  keyring: Keyring;

  getIdentity: () => Identity;
  acceptIdentity: (identity: JoinIdentityParams) => Promise<Identity>;
};

/**
 * Handles the life-cycle of Halo invitations between peers.
 */
// TODO(dmaretskyi): Split into Host and Guest parts.
export class HaloInvitationsHandler extends AbstractInvitationsHandler {
  // prettier-ignore
  constructor(
    private readonly _params: HaloInvitationsHandlerParams
  ) {
    super(_params.networkManager);
  }

  /**
   * Creates an invitation and listens for a join request from the invited (guest) peer.
   */
  createInvitation(context: void, options?: InvitationsOptions): CancellableInvitationObservable {
    const { type, timeout = INVITATION_TIMEOUT, swarmKey } = options ?? {};
    assert(type !== Invitation.Type.OFFLINE);
    const identity = this._params.getIdentity();

    // TODO(dmaretskyi): Add invitation kind: halo/space.
    const invitation: Invitation = {
      type,
      invitationId: PublicKey.random().toHex(),
      swarmKey: swarmKey ?? PublicKey.random(),
      authenticationCode: generatePasscode(AUTHENTICATION_CODE_LENGTH)
    };

    const ctx = new Context({
      onError: (err) => {
        void ctx.dispose();
        observable.callback.onError(err);
      }
    });

    // TODO(burdon): Stop anything pending.
    const observable = new InvitationObservableProvider(async () => {
      await ctx.dispose();
    });

    let authenticationCode: string;
    const complete = new Trigger<PublicKey>();

    // Called for every connecting peer.
    const createExtension = (): HostHaloInvitationExtension => {
      const hostInvitationExtension = new HostHaloInvitationExtension({
        requestAdmission: async () => {
          log('responding with admission offer', {
            host: identity.deviceKey
          });

          // TODO(burdon): Is this the right place to set this state?
          observable.callback.onAuthenticating?.(invitation);
          return {
            identityKey: identity.identityKey,
            haloSpaceKey: identity.haloSpaceKey,
            genesisFeedKey: identity.haloGenesisFeedKey
          };
        },

        authenticate: async ({ authenticationCode: code }) => {
          log('received authentication request', { authenticationCode: code });
          authenticationCode = code;
          return { status: AuthenticationResponse.Status.OK };
        },

        // TODO(burdon): Not used: controlFeedKey, dataFeedKey.
        presentAdmissionCredentials: async (credentials) => {
          try {
            // Check authenticated.
            if (invitation.type !== Invitation.Type.INTERACTIVE_TESTING) {
              if (invitation.authenticationCode === undefined || invitation.authenticationCode !== authenticationCode) {
                throw new Error(`invalid authentication code: ${authenticationCode}`);
              }
            }

            log('writing guest credentials', { host: identity.deviceKey, guest: credentials.deviceKey });
            // TODO(burdon): Check if already admitted.
            await identity.admitDevice(credentials);

            // Updating credentials complete.
            complete.wake(credentials.deviceKey);
          } catch (err) {
            // TODO(burdon): Generic RPC callback to report error to client.
            observable.callback.onError(err);
            throw err; // Propagate error to guest.
          }
        },

        onOpen: () => {
          scheduleTask(ctx, async () => {
            try {
              log('connected', { host: identity.deviceKey });
              observable.callback.onConnected?.(invitation);
              const deviceKey = await complete.wait({ timeout });
              log('admitted guest', { host: identity.deviceKey, guest: deviceKey });
              observable.callback.onSuccess(invitation);
            } catch (err) {
              if (!observable.cancelled) {
                log.error('failed', err);
                observable.callback.onError(err);
              }
            } finally {
              // NOTE: If we close immediately after `complete` trigger finishes, Guest won't receive the reply to the last RPC.
              // TODO(dmaretskyi): Implement a soft-close which waits for the last connection to terminate before closing.
              await sleep(ON_CLOSE_DELAY);
              await ctx.dispose();
            }
          });
        }
      });
      return hostInvitationExtension;
    };

    scheduleTask(ctx, async () => {
      const topic = invitation.swarmKey!;
      const swarmConnection = await this._networkManager.joinSwarm({
        topic,
        peerId: topic,
        protocolProvider: createTeleportProtocolFactory(async (teleport) => {
          teleport.addExtension('dxos.halo.invitations', createExtension());
        }),
        topology: new StarTopology(topic)
      });
      ctx.onDispose(() => swarmConnection.close());

      observable.callback.onConnecting?.(invitation);
    });

    return observable;
  }

  /**
   * Waits for the host peer (inviter) to accept our join request.
   * The local guest peer (invitee) then sends the local halo invitation to the host,
   * which then writes the guest's credentials to the halo.
   */
  acceptInvitation(invitation: Invitation, options?: InvitationsOptions): AuthenticatingInvitationProvider {
    const { timeout = INVITATION_TIMEOUT } = options ?? {};

    const ctx = new Context({
      onError: (err) => {
        void ctx.dispose();
        observable.callback.onError(err);
      }
    });

    const authenticated = new Trigger<string>();
    const observable = new AuthenticatingInvitationProvider({
      onCancel: async () => {
        await ctx.dispose();
      },

      // TODO(burdon): Consider retry.
      onAuthenticate: async (code: string) => {
        authenticated.wake(code);
      }
    });

    let connectionCount = 0;
    const complete = new Trigger<PublicKey>();

    const createExtension = (): GuestHaloInvitationExtension => {
      const extension = new GuestHaloInvitationExtension({
        onOpen: () => {
          scheduleTask(ctx, async () => {
            try {
              // TODO(burdon): Bug where guest may create multiple connections.
              if (++connectionCount > 1) {
                throw new Error(`multiple connections detected: ${connectionCount}`);
              }

              log('connected');
              observable.callback.onConnected?.(invitation);

              // 1. Send request.
              log('sending admission request');
              const { identityKey, haloSpaceKey, genesisFeedKey } =
                await extension.rpc.HaloHostService.requestAdmission();

              // 2. Get authentication code.
              // TODO(burdon): Test timeout (options for timeouts at different steps).
              if (invitation.type === undefined || invitation.type === Invitation.Type.INTERACTIVE) {
                log('guest waiting for authentication code...');
                observable.callback.onAuthenticating?.(invitation);
                const authenticationCode = await authenticated.wait({ timeout });
                log('sending authentication request');
                await extension.rpc.HaloHostService.authenticate({ authenticationCode });
              }

              const deviceKey = await this._params.keyring.createKey();
              const controlFeedKey = await this._params.keyring.createKey();
              const dataFeedKey = await this._params.keyring.createKey();

              // 3. Send admission credentials to host (with local identity keys).
              log('presenting admission credentials', { identityKey, deviceKey, controlFeedKey, dataFeedKey });
              await extension.rpc.HaloHostService.presentAdmissionCredentials({
                deviceKey,
                controlFeedKey,
                dataFeedKey
              });

              // 4. Create local identity.
              // TODO(burdon): Abandon if does not complete (otherwise retry will fail).
              const identity = await this._params.acceptIdentity({
                identityKey,
                deviceKey,
                haloSpaceKey,
                haloGenesisFeedKey: genesisFeedKey,
                controlFeedKey,
                dataFeedKey
              });

              // 5. Success.
              log('admitted by host', { guest: identity.deviceKey, identityKey });
              complete.wake(identityKey);
            } catch (err) {
              if (!observable.cancelled) {
                log.warn('auth failed', err);
                observable.callback.onError(err);
              }
            } finally {
              await ctx.dispose();
            }
          });
        }
      });
      return extension;
    };

    scheduleTask(ctx, async () => {
      assert(invitation.swarmKey);
      const topic = invitation.swarmKey;
      const swarmConnection = await this._networkManager.joinSwarm({
        topic,
        peerId: PublicKey.random(),
        protocolProvider: createTeleportProtocolFactory(async (teleport) => {
          teleport.addExtension('dxos.halo.invitations', createExtension());
        }),
        topology: new StarTopology(topic)
      });
      ctx.onDispose(() => swarmConnection.close());

      observable.callback.onConnecting?.(invitation);
      invitation.identityKey = await complete.wait();
      observable.callback.onSuccess(invitation);
      await ctx.dispose();
    });

    return observable;
  }
}

type HostHaloInvitationExtensionCallbacks = {
  requestAdmission: () => Promise<HaloAdmissionOffer>;
  authenticate: (request: AuthenticationRequest) => Promise<AuthenticationResponse>;
  presentAdmissionCredentials: (request: HaloAdmissionCredentials) => Promise<void>;
  // Deliberately not async to not block the extensions opening.
  onOpen: () => void;
};

/**
 * Host's side for a connection to a concrete peer in p2p network during invitation.
 */
class HostHaloInvitationExtension extends RpcExtension<{}, { HaloHostService: HaloHostService }> {
  constructor(private readonly _callbacks: HostHaloInvitationExtensionCallbacks) {
    super({
      exposed: {
        HaloHostService: schema.getService('dxos.halo.invitations.HaloHostService')
      }
    });
  }

  protected override async getHandlers(): Promise<{ HaloHostService: HaloHostService }> {
    return {
      // TODO(dmaretskyi): For now this is just forwarding the data to callbacks since we don't have session-specific logic.
      // Perhaps in the future we will have more complex logic here.
      HaloHostService: {
        requestAdmission: async () => {
          return this._callbacks.requestAdmission();
        },

        authenticate: async (credentials) => {
          return this._callbacks.authenticate(credentials);
        },

        // TODO(burdon): Not used: controlFeedKey, dataFeedKey.
        presentAdmissionCredentials: async (credentials) => {
          return this._callbacks.presentAdmissionCredentials(credentials);
        }
      }
    };
  }

  override async onOpen(context: ExtensionContext) {
    await super.onOpen(context);
    this._callbacks.onOpen();
  }
}

type GuestHaloInvitationExtensionCallbacks = {
  // Deliberately not async to not block the extensions opening.
  onOpen: () => void;
};

/**
 * Guest's side for a connection to a concrete peer in p2p network during invitation.
 */
class GuestHaloInvitationExtension extends RpcExtension<{ HaloHostService: HaloHostService }, {}> {
  constructor(private readonly _callbacks: GuestHaloInvitationExtensionCallbacks) {
    super({
      requested: {
        HaloHostService: schema.getService('dxos.halo.invitations.HaloHostService')
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
