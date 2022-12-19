//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { scheduleTask, sleep, Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { createAdmissionCredentials, generatePasscode, getCredentialAssertion } from '@dxos/credentials';
import { SigningContext, Space, SpaceManager } from '@dxos/echo-db';
import { writeMessages } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createTeleportProtocolFactory, NetworkManager, StarTopology, SwarmConnection } from '@dxos/network-manager';
import { schema, TypedMessage } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AuthenticationResponse, SpaceHostService, SpaceAdmissionCredentials } from '@dxos/protocols/proto/dxos/halo/invitations';
import { ExtensionContext, RpcExtension } from '@dxos/teleport';

import {
  AuthenticatingInvitationProvider,
  AUTHENTICATION_CODE_LENGTH,
  CancellableInvitationObservable,
  InvitationObservableProvider,
  INVITATION_TIMEOUT,
  ON_CLOSE_DELAY
} from './invitations';
import { AbstractInvitationsHandler, InvitationsOptions } from './invitations-handler';

const MAX_OTP_ATTEMPTS = 3;

type CredentialParams = {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  controlFeedKey: PublicKey;
  dataFeedKey: PublicKey;
  guestProfile: ProfileDocument;
};

type CredentialProvider = (params: CredentialParams) => Promise<SpaceAdmissionCredentials>;

/**
 * Handles the life-cycle of Space invitations between peers.
 */
export class SpaceInvitationsHandler extends AbstractInvitationsHandler<Space> {
  constructor(
    networkManager: NetworkManager,
    private readonly _spaceManager: SpaceManager,
    private readonly _signingContext: SigningContext,
    private readonly _keyring: Keyring
  ) {
    super(networkManager);
  }

  /**
   * Creates an invitation and listens for a join request from the invited (guest) peer.
   */
  createInvitation(space: Space, options?: InvitationsOptions): CancellableInvitationObservable {
    let swarmConnection: SwarmConnection | undefined;
    const { type, swarmKey } = options ?? {};
    assert(type !== Invitation.Type.OFFLINE);
    assert(space);

    // TODO(burdon): Stop anything pending.
    const observable = new InvitationObservableProvider({
      onCancel: async () => {
        await swarmConnection?.close(); // TODO(burdon): Also on Error.
      }
    });

    const ctx = new Context({
      onError: (err) => {
        void ctx.dispose();
        observable.callback.onError(err);
      }
    });

    // TODO(dmaretskyi): Add invitation kind: halo/space: RB: Doesn't space.key imply this?
    const invitation: Invitation = {
      type,
      invitationId: PublicKey.random().toHex(),
      swarmKey: swarmKey ?? PublicKey.random(),
      spaceKey: space.key,
      authenticationCode: generatePasscode(AUTHENTICATION_CODE_LENGTH)
    };

    const credentialsProvider = async ({
      identityKey,
      deviceKey,
      controlFeedKey,
      dataFeedKey,
      guestProfile
    }: CredentialParams) => {
      const credentials = await createAdmissionCredentials(
        this._signingContext.credentialSigner,
        identityKey,
        deviceKey,
        space.key, // TODO(burdon): Reorder.
        space.genesisFeedKey,
        controlFeedKey,
        dataFeedKey,
        guestProfile
      );

      await writeMessages(space.controlPipeline.writer, credentials);

      // TODO(dmaretskyi): Refactor.
      assert(credentials[0]['@type'] === 'dxos.echo.feed.CredentialsMessage');
      const spaceMemberCredential = credentials[0].credential;
      assert(getCredentialAssertion(spaceMemberCredential)['@type'] === 'dxos.halo.credentials.SpaceMember');
      return { credential: spaceMemberCredential };
    };

    // Join swarm with specific extension to handle invitation requests from guest.
    scheduleTask(ctx, async () => {
      const topic = invitation.swarmKey!;
      const swarmConnection = await this._networkManager.joinSwarm({
        topic,
        peerId: topic,
        topology: new StarTopology(topic),
        protocolProvider: createTeleportProtocolFactory(async (teleport) => {
          teleport.addExtension(
            'dxos.halo.invitations',
            new HostSpaceInvitationExtension(
              ctx.derive(), // TODO(burdon): Kill parent context on error.
              this._signingContext.deviceKey,
              credentialsProvider,
              observable,
              invitation,
              options
            )
          );
        })
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
    const ctx = new Context({
      onError: (err) => {
        void ctx.dispose();
        observable.callback.onError(err);
      }
    });

    const authenticated = new Trigger<string>();
    const complete = new Trigger();

    const observable = new AuthenticatingInvitationProvider({
      onCancel: async () => {
        await ctx.dispose();
      },

      onAuthenticate: async (code: string) => {
        // TODO(burdon): Reset creates a race condition? Replace with Event?
        authenticated.wake(code);
      }
    });

    // Join swarm with specific extension to make invitation request.
    scheduleTask(ctx, async () => {
      assert(invitation.swarmKey);
      const topic = invitation.swarmKey;
      // TODO(burdon): Catch if swarm disconnects (or other side disconnects)?
      const swarmConnection = await this._networkManager.joinSwarm({
        topic,
        peerId: PublicKey.random(),
        topology: new StarTopology(topic),
        protocolProvider: createTeleportProtocolFactory(async (teleport) => {
          teleport.addExtension(
            'dxos.halo.invitations',
            new GuestSpaceInvitationExtension<{ SpaceHostService: SpaceHostService }>(
              {
                SpaceHostService: schema.getService('dxos.halo.invitations.SpaceHostService')
              },
              ctx.derive(),
              this._spaceManager,
              this._signingContext,
              this._keyring,
              authenticated,
              complete,
              observable,
              invitation,
              options
            )
          );
        })
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

/**
 * Host's side for a connection to a concrete peer in p2p network during invitation.
 */
class HostSpaceInvitationExtension extends RpcExtension<{}, { SpaceHostService: SpaceHostService }> {
  private _authenticationCode?: string;
  private _authenticationAttempts = 0;

  readonly complete = new Trigger<PublicKey>();

  constructor(
    private readonly _ctx: Context,
    private readonly _deviceKey: PublicKey,
    private readonly _credentialsProvider: CredentialProvider,
    private readonly _observable: InvitationObservableProvider,
    private readonly _invitation: Invitation,
    private readonly _options?: InvitationsOptions
  ) {
    super({
      exposed: {
        SpaceHostService: schema.getService('dxos.halo.invitations.SpaceHostService')
      }
    });
  }

  protected override async getHandlers(): Promise<{ SpaceHostService: SpaceHostService }> {
    let guestProfile: ProfileDocument | undefined;

    return {
      // TODO(dmaretskyi): For now this is just forwarding the data to callbacks since we don't have session-specific logic.
      // Perhaps in the future we will have more complex logic here.
      SpaceHostService: {
        //
        // Get profile from guest.
        //
        introduce: async ({ profile }) => {
          guestProfile = profile;
          log('received introduction from guest', {
            guest: profile,
            host: this._deviceKey
          });

          // TODO(burdon): Is this the right place to set this state?
          // TODO(dmaretskyi): Should we expose guest's profile in this callback?
          this._observable.callback.onAuthenticating?.(this._invitation);
        },

        //
        // Get authentication code from guest.
        //
        authenticate: async ({ authenticationCode: code }) => {
          log('received authentication request', { authenticationCode: code });
          let status = AuthenticationResponse.Status.OK;
          if (this._invitation.authenticationCode) {
            if (this._authenticationAttempts++ > MAX_OTP_ATTEMPTS) {
              status = AuthenticationResponse.Status.INVALID_OPT_ATTEMPTS;
            } else if (code !== this._invitation.authenticationCode) {
              status = AuthenticationResponse.Status.INVALID_OTP;
            } else {
              this._authenticationCode = code;
            }
          }

          return { status };
        },

        //
        // Process admission request.
        //
        requestAdmission: async ({ identityKey, deviceKey, controlFeedKey, dataFeedKey }) => {
          try {
            // Check authenticated.
            if (this._invitation.type !== Invitation.Type.INTERACTIVE_TESTING) {
              if (
                this._invitation.authenticationCode === undefined ||
                this._invitation.authenticationCode !== this._authenticationCode
              ) {
                throw new Error(`invalid authentication code: ${this._authenticationCode}`);
              }
            }

            assert(guestProfile);
            log('writing guest credentials', { host: this._deviceKey, guest: deviceKey });
            const credentials = await this._credentialsProvider({
              identityKey,
              deviceKey,
              controlFeedKey,
              dataFeedKey,
              guestProfile
            });

            // Updating credentials complete.
            this.complete.wake(deviceKey);

            return credentials;
          } catch (err) {
            // TODO(burdon): Generic RPC callback to report error to client?
            this._observable.callback.onError(err);
            throw err; // Propagate error to guest.
          }
        }
      }
    };
  }

  override async onOpen(context: ExtensionContext) {
    await super.onOpen(context);

    scheduleTask(this._ctx, async () => {
      try {
        const { timeout = INVITATION_TIMEOUT } = this._options ?? {};
        log('connected', { host: this._deviceKey });
        this._observable.callback.onConnected?.(this._invitation);
        const deviceKey = await this.complete.wait({ timeout });
        log('admitted guest', { host: this._deviceKey, guest: deviceKey });
        this._observable.callback.onSuccess(this._invitation);
      } catch (err) {
        if (!this._observable.cancelled) {
          log.error('failed', err);
          this._observable.callback.onError(err);
        }
      } finally {
        await sleep(ON_CLOSE_DELAY);
        await this._ctx.dispose();
      }
    });
  }
}

/**
 * Guest's side for a connection to a concrete peer in p2p network during invitation.
 */
abstract class AbstractGuestInvitationExtension<S> extends RpcExtension<S, {}> {
  private _connectionCount = 0;

  constructor(
    service: S,
    private readonly _ctx: Context,
    protected readonly _spaceManager: SpaceManager,
    protected readonly _signingContext: SigningContext,
    protected readonly _keyring: Keyring,
    // Trigger when authenticated.
    private readonly _authenticated: Trigger<string>,
    // Trigger when complete.
    private readonly _complete: Trigger,
    // Observable returned to caller.
    private readonly _observable: AuthenticatingInvitationProvider,
    // Invitation structure from caller.
    private readonly _invitation: Invitation,
    private readonly _options?: InvitationsOptions
  ) {
    // TODO(burdon): Factor out.
    super({
      requested: service
    });
  }

  // TODO(burdon): Make default.
  protected override async getHandlers() {
    return {};
  }

  override async onOpen(context: ExtensionContext) {
    await super.onOpen(context);

    scheduleTask(this._ctx, async () => {
      try {
        // TODO(burdon): Bug where guest may create multiple connections <== is this still true with teleport?
        if (++this._connectionCount > 1) {
          throw new Error(`multiple connections detected: ${this._connectionCount}`);
        }

        log('connected', { guest: this._signingContext.deviceKey });
        this._observable.callback.onConnected?.(this._invitation);

        //
        // 1. Send profile to host.
        //

        log('introduce', { guest: this._signingContext.deviceKey });
        await this.onIntroduce();

        //
        // 2. Get authentication code from user.
        //

        if (this._invitation.type === undefined || this._invitation.type === Invitation.Type.INTERACTIVE) {
          const { timeout = INVITATION_TIMEOUT } = this._options ?? {};
          for (let attempt = 1; attempt <= MAX_OTP_ATTEMPTS; attempt++) {
            log('guest waiting for authentication code...');
            this._observable.callback.onAuthenticating?.(this._invitation);
            const authenticationCode = await this._authenticated.wait({ timeout });

            log('sending authentication request');
            const response = await this.onAuthenticate(authenticationCode);
            if (response.status === undefined || response.status === AuthenticationResponse.Status.OK) {
              break;
            }

            if (response.status === AuthenticationResponse.Status.INVALID_OTP) {
              if (attempt === MAX_OTP_ATTEMPTS) {
                throw new Error(`Maximum retry attempts: ${MAX_OTP_ATTEMPTS}`);
              } else {
                log('retrying invalid code', { attempt });
                this._authenticated.reset();
              }
            }
          }
        }

        //
        // 3. Request admission.
        //

        // Send admission credentials to host (with local space keys).
        log('request admission', { guest: this._signingContext.deviceKey });
        await this.onRequestAdmission();

        // Success.
        log('admitted by host', { guest: this._signingContext.deviceKey });
        this._complete.wake();
      } catch (err) {
        if (!this._observable.cancelled) {
          log.warn('auth failed', err);
          this._observable.callback.onError(err);
        }
      } finally {
        await this._ctx.dispose();
      }
    });
  }

  abstract onIntroduce(): Promise<void>;

  abstract onAuthenticate(authenticationCode: string): Promise<AuthenticationResponse>;

  abstract onRequestAdmission(): Promise<void>;
}

class GuestSpaceInvitationExtension<S> extends AbstractGuestInvitationExtension<S> {
  //
  // Virtual.
  // TODO(burdon): Rethink generic state machine with pseudo-code.
  //  - Extension state machines (don't pass in observable).
  //    - Credential generation and writing
  //    - Request admission
  //    - Accept (record credential for space)
  //  - Common observable callbacks.
  // TODO(burdon): Replace triggers with callbacks. Generic callbacks for extension.
  // TODO(burdon): Factor out credential creation (instead of inheritance).
  //

  async onIntroduce() {
    await this.rpc.SpaceHostService.introduce({
      profile: this._signingContext.profile
    });
  }

  async onAuthenticate(authenticationCode: string) {
    return await this.rpc.SpaceHostService.authenticate({ authenticationCode });
  }

  async onRequestAdmission() {
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();

    const { credential } = await this.rpc.SpaceHostService.requestAdmission({
      identityKey: this._signingContext.identityKey,
      deviceKey: this._signingContext.deviceKey,
      controlFeedKey,
      dataFeedKey
    });

    const assertion = getCredentialAssertion(credential);
    assert(assertion['@type'] === 'dxos.halo.credentials.SpaceMember', 'Invalid credential');
    assert(credential.subject.id.equals(this._signingContext.identityKey));

    // TODO(dmaretskyi): Record credential in guest's HALO.
    const space = await this._spaceManager.acceptSpace({
      spaceKey: assertion.spaceKey,
      genesisFeedKey: assertion.genesisFeedKey,
      controlFeedKey,
      dataFeedKey
    });

    log('admitted', { space: space.key });
  }
}
