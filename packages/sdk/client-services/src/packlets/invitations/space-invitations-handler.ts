//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { scheduleTask, sleep, Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { createAdmissionCredentials, generatePasscode } from '@dxos/credentials';
import { SigningContext, Space, SpaceManager } from '@dxos/echo-db';
import { writeMessages } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createTeleportProtocolFactory, NetworkManager, StarTopology, SwarmConnection } from '@dxos/network-manager';
import { schema } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import {
  AdmissionParameters,
  AuthenticationRequest,
  AuthenticationResponse,
  SpaceAdmissionCredentials,
  SpaceAdmissionOffer,
  SpaceHostService
} from '@dxos/protocols/proto/dxos/halo/invitations';
import { ExtensionContext } from '@dxos/teleport';

import {
  AuthenticatingInvitationProvider,
  AUTHENTICATION_CODE_LENGTH,
  CancellableInvitationObservable,
  InvitationObservableProvider,
  INVITATION_TIMEOUT,
  ON_CLOSE_DELAY
} from './invitations';
import { AbstractInvitationsHandler, InvitationsOptions } from './invitations-handler';
import { RpcExtension } from './rpc-extension';

const MAX_OTP_ATTEMPTS = 3;

/**
 * Handles the life-cycle of Space invitations between peers.
 */
// TODO(dmaretskyi): Split into Host and Guest parts.
export class SpaceInvitationsHandler extends AbstractInvitationsHandler<Space> {
  constructor(
    networkManager: NetworkManager,
    private readonly _spaceManager: SpaceManager,
    private readonly _signingContext: SigningContext
  ) {
    super(networkManager);
  }

  /**
   * Creates an invitation and listens for a join request from the invited (guest) peer.
   */
  createInvitation(space: Space, options?: InvitationsOptions): CancellableInvitationObservable {
    let swarmConnection: SwarmConnection | undefined;
    const { type, timeout = INVITATION_TIMEOUT, swarmKey } = options ?? {};
    assert(type !== Invitation.Type.OFFLINE);
    assert(space);

    // TODO(dmaretskyi): Add invitation kind: halo/space.
    const invitation: Invitation = {
      type,
      invitationId: PublicKey.random().toHex(),
      swarmKey: swarmKey ?? PublicKey.random(),
      spaceKey: space.key,
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
      await swarmConnection?.close();
    });

    let authenticationCode: string;
    let authenticationRetry = 0;

    const complete = new Trigger<PublicKey>();

    // Called for every connecting peer.
    const createExtension = (): HostSpaceInvitationExtension => {
      let guestProfile: ProfileDocument | undefined;

      const hostInvitationExtension = new HostSpaceInvitationExtension({
        requestAdmission: async ({ profile }) => {
          log('responding with admission offer', {
            guestProfile: profile,
            host: this._signingContext.deviceKey,
            spaceKey: space.key
          });

          guestProfile = profile;

          // TODO(burdon): Is this the right place to set this state?
          // TODO(dmaretskyi): Should we expose guest's profile in this callback?
          observable.callback.onAuthenticating?.(invitation);
          return {
            spaceKey: space.key,
            genesisFeedKey: space.genesisFeedKey
          };
        },

        authenticate: async ({ authenticationCode: code }) => {
          log('received authentication request', { authenticationCode: code });
          let status = AuthenticationResponse.Status.OK;
          if (invitation.authenticationCode) {
            if (authenticationRetry++ > MAX_OTP_ATTEMPTS) {
              status = AuthenticationResponse.Status.INVALID_OPT_ATTEMPTS;
            } else if (code !== invitation.authenticationCode) {
              status = AuthenticationResponse.Status.INVALID_OTP;
            } else {
              authenticationCode = code;
            }
          }

          return { status };
        },

        presentAdmissionCredentials: async ({ identityKey, deviceKey, controlFeedKey, dataFeedKey }) => {
          try {
            // Check authenticated.
            if (invitation.type !== Invitation.Type.INTERACTIVE_TESTING) {
              if (invitation.authenticationCode === undefined || invitation.authenticationCode !== authenticationCode) {
                throw new Error(`invalid authentication code: ${authenticationCode}`);
              }
            }

            log('writing guest credentials', { host: this._signingContext.deviceKey, guest: deviceKey });
            // TODO(burdon): Check if already admitted.
            await writeMessages(
              space.controlPipeline.writer,
              await createAdmissionCredentials(
                this._signingContext.credentialSigner,
                identityKey,
                deviceKey,
                space.key,
                controlFeedKey,
                dataFeedKey,
                guestProfile
              )
            );

            // Updating credentials complete.
            complete.wake(deviceKey);
          } catch (err) {
            // TODO(burdon): Generic RPC callback to report error to client.
            observable.callback.onError(err);
            throw err; // Propagate error to guest.
          }
        },

        onOpen: () => {
          scheduleTask(ctx, async () => {
            try {
              log('connected', { host: this._signingContext.deviceKey });
              observable.callback.onConnected?.(invitation);
              const deviceKey = await complete.wait({ timeout });
              log('admitted guest', { host: this._signingContext.deviceKey, guest: deviceKey });
              observable.callback.onSuccess(invitation);
            } catch (err) {
              if (!observable.cancelled) {
                log.error('failed', err);
                observable.callback.onError(err);
              }
            } finally {
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
   * The local guest peer (invitee) then sends the local space invitation to the host,
   * which then writes the guest's credentials to the space.
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

      onAuthenticate: async (code: string) => {
        // TODO(burdon): Reset creates a race condition? Event?
        authenticated.wake(code);
      }
    });

    let connectionCount = 0;
    const complete = new Trigger();

    const createExtension = (): GuestSpaceInvitationExtension => {
      const extension = new GuestSpaceInvitationExtension({
        onOpen: () => {
          scheduleTask(ctx, async () => {
            try {
              // TODO(burdon): Bug where guest may create multiple connections.
              if (++connectionCount > 1) {
                throw new Error(`multiple connections detected: ${connectionCount}`);
              }

              log('connected', { guest: this._signingContext.deviceKey });
              observable.callback.onConnected?.(invitation);

              // 1. Send request.
              log('sending admission request', { guest: this._signingContext.deviceKey });
              const { spaceKey, genesisFeedKey } = await extension.rpc.SpaceHostService.requestAdmission({
                profile: this._signingContext.profile
              });

              // 2. Get authentication code.
              // TODO(burdon): Test timeout (options for timeouts at different steps).
              if (invitation.type === undefined || invitation.type === Invitation.Type.INTERACTIVE) {
                for (let attempt = 1; attempt <= MAX_OTP_ATTEMPTS; attempt++) {
                  log('guest waiting for authentication code...');
                  observable.callback.onAuthenticating?.(invitation);
                  const authenticationCode = await authenticated.wait({ timeout });

                  log('sending authentication request');
                  const response = await extension.rpc.SpaceHostService.authenticate({ authenticationCode });
                  if (response.status === undefined || response.status === AuthenticationResponse.Status.OK) {
                    break;
                  }

                  if (response.status === AuthenticationResponse.Status.INVALID_OTP) {
                    if (attempt === MAX_OTP_ATTEMPTS) {
                      throw new Error(`Maximum retry attempts: ${MAX_OTP_ATTEMPTS}`);
                    } else {
                      log('retrying invalid code', { attempt });
                      authenticated.reset();
                    }
                  }
                }
              }

              // 3. Create local space.
              // TODO(burdon): Abandon if does not complete (otherwise retry will fail).
              const space = await this._spaceManager.acceptSpace({ spaceKey, genesisFeedKey });

              // 4. Send admission credentials to host (with local space keys).
              log('presenting admission credentials', { guest: this._signingContext.deviceKey, spaceKey: space.key });
              await extension.rpc.SpaceHostService.presentAdmissionCredentials({
                identityKey: this._signingContext.identityKey,
                deviceKey: this._signingContext.deviceKey,
                controlFeedKey: space.controlFeedKey,
                dataFeedKey: space.dataFeedKey
              });

              // 5. Success.
              log('admitted by host', { guest: this._signingContext.deviceKey, spaceKey: space.key });
              complete.wake();
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
      await complete.wait();
      observable.callback.onSuccess(invitation);
      await ctx.dispose();
    });

    return observable;
  }
}

type HostSpaceInvitationExtensionCallbacks = {
  requestAdmission: (params: AdmissionParameters) => Promise<SpaceAdmissionOffer>;
  authenticate: (request: AuthenticationRequest) => Promise<AuthenticationResponse>;
  presentAdmissionCredentials: (request: SpaceAdmissionCredentials) => Promise<void>;
  // Deliberately not async to not block the extensions opening.
  onOpen: () => void;
};

/**
 * Host's side for a connection to a concrete peer in p2p network during invitation.
 */
class HostSpaceInvitationExtension extends RpcExtension<{}, { SpaceHostService: SpaceHostService }> {
  constructor(private readonly _callbacks: HostSpaceInvitationExtensionCallbacks) {
    super({
      exposed: {
        SpaceHostService: schema.getService('dxos.halo.invitations.SpaceHostService')
      }
    });
  }

  protected override async getHandlers(): Promise<{ SpaceHostService: SpaceHostService }> {
    return {
      // TODO(dmaretskyi): For now this is just forwarding the data to callbacks since we don't have session-specific logic.
      // Perhaps in the future we will have more complex logic here.
      SpaceHostService: {
        requestAdmission: async (params) => {
          return this._callbacks.requestAdmission(params);
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

type GuestSpaceInvitationExtensionCallbacks = {
  // Deliberately not async to not block the extensions opening.
  onOpen: () => void;
};

/**
 * Guest's side for a connection to a concrete peer in p2p network during invitation.
 */
class GuestSpaceInvitationExtension extends RpcExtension<{ SpaceHostService: SpaceHostService }, {}> {
  constructor(private readonly _callbacks: GuestSpaceInvitationExtensionCallbacks) {
    super({
      requested: {
        SpaceHostService: schema.getService('dxos.halo.invitations.SpaceHostService')
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
