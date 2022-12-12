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
import { schema } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AuthenticationResponse, SpaceHostService } from '@dxos/protocols/proto/dxos/halo/invitations';
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

    // TODO(burdon): Instead of creating a complex closure over a specialized class (HostSpaceInvitationExtension)
    //  that requires callbacks, make a more concrete class that manages its own state.
    //  i.e., keep `createInvitation` simple.
    //  Possibility to factor out space/halo extensions?

    // Join swarm with specific extension to handle invitation requests from guest.
    scheduleTask(ctx, async () => {
      // TODO(burdon): Reuse same context?
      const extension = new HostSpaceInvitationExtension(
        ctx,
        space,
        this._signingContext,
        this._keyring,
        observable,
        invitation,
        options
      );

      const topic = invitation.swarmKey!;
      const swarmConnection = await this._networkManager.joinSwarm({
        topic,
        peerId: topic,
        protocolProvider: createTeleportProtocolFactory(async (teleport) => {
          teleport.addExtension('dxos.halo.invitations', extension);
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
    const ctx = new Context({
      onError: (err) => {
        void ctx.dispose();
        observable.callback.onError(err);
      }
    });

    const observable = new AuthenticatingInvitationProvider({
      onCancel: async () => {
        await ctx.dispose();
      },

      onAuthenticate: async (code: string) => {
        // TODO(burdon): Reset creates a race condition? Event?
        extension.authenticated.wake(code);
      }
    });

    const extension = new GuestSpaceInvitationExtension(
      ctx,
      this._spaceManager,
      this._signingContext,
      this._keyring,
      observable,
      invitation,
      options
    );

    // Join swarm with specific extension to make invitation request.
    scheduleTask(ctx, async () => {
      assert(invitation.swarmKey);
      const topic = invitation.swarmKey;
      const swarmConnection = await this._networkManager.joinSwarm({
        topic,
        peerId: PublicKey.random(),
        protocolProvider: createTeleportProtocolFactory(async (teleport) => {
          teleport.addExtension('dxos.halo.invitations', extension);
        }),
        topology: new StarTopology(topic)
      });

      ctx.onDispose(() => swarmConnection.close());
      observable.callback.onConnecting?.(invitation);

      await extension.complete.wait();
      observable.callback.onSuccess(invitation);

      await ctx.dispose();
    });

    return observable;
  }
}

// TODO(burdon): Factor out subclass shared by space and halo invitations (e.g., credential writing).

/**
 * Host's side for a connection to a concrete peer in p2p network during invitation.
 */
class HostSpaceInvitationExtension extends RpcExtension<{}, { SpaceHostService: SpaceHostService }> {
  _authenticationCode?: string;
  _authenticationRetry = 0;

  readonly complete = new Trigger<PublicKey>();

  constructor(
    private readonly _ctx: Context,
    private readonly _space: Space,
    private readonly _signingContext: SigningContext,
    private readonly _keyring: Keyring,
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
        introduce: async ({ profile }) => {
          guestProfile = profile;
          log('received introduction from guest', {
            guest: profile,
            host: this._signingContext.deviceKey,
            spaceKey: this._space.key
          });

          // TODO(burdon): Is this the right place to set this state?
          // TODO(dmaretskyi): Should we expose guest's profile in this callback?
          this._observable.callback.onAuthenticating?.(this._invitation);
        },

        authenticate: async ({ authenticationCode: code }) => {
          log('received authentication request', { authenticationCode: code });
          let status = AuthenticationResponse.Status.OK;
          if (this._invitation.authenticationCode) {
            if (this._authenticationRetry++ > MAX_OTP_ATTEMPTS) {
              status = AuthenticationResponse.Status.INVALID_OPT_ATTEMPTS;
            } else if (code !== this._invitation.authenticationCode) {
              status = AuthenticationResponse.Status.INVALID_OTP;
            } else {
              this._authenticationCode = code;
            }
          }

          return { status };
        },

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

            log('writing guest credentials', { host: this._signingContext.deviceKey, guest: deviceKey });
            // TODO(burdon): Check if already admitted.
            const credentials = await createAdmissionCredentials(
              this._signingContext.credentialSigner,
              identityKey,
              deviceKey,
              this._space.key,
              this._space.genesisFeedKey,
              controlFeedKey,
              dataFeedKey,
              guestProfile
            );

            // TODO(dmaretskyi): Refactor.
            assert(credentials[0]['@type'] === 'dxos.echo.feed.CredentialsMessage');
            const spaceMemberCredential = credentials[0].credential;
            assert(getCredentialAssertion(spaceMemberCredential)['@type'] === 'dxos.halo.credentials.SpaceMember');
            await writeMessages(this._space.controlPipeline.writer, credentials);

            // Updating credentials complete.
            this.complete.wake(deviceKey);

            return { credential: spaceMemberCredential };
          } catch (err) {
            // TODO(burdon): Generic RPC callback to report error to client.
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
        log('connected', { host: this._signingContext.deviceKey });
        this._observable.callback.onConnected?.(this._invitation);
        const deviceKey = await this.complete.wait({ timeout });
        log('admitted guest', { host: this._signingContext.deviceKey, guest: deviceKey });
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
class GuestSpaceInvitationExtension extends RpcExtension<{ SpaceHostService: SpaceHostService }, {}> {
  private _connectionCount = 0;

  readonly complete = new Trigger();
  readonly authenticated = new Trigger<string>();

  constructor(
    private readonly _ctx: Context,
    private readonly _spaceManager: SpaceManager,
    private readonly _signingContext: SigningContext,
    private readonly _keyring: Keyring,
    private readonly _observable: AuthenticatingInvitationProvider,
    private readonly _invitation: Invitation,
    private readonly _options?: InvitationsOptions
  ) {
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

    // TODO(burdon): Can this be split (state machine?)
    scheduleTask(this._ctx, async () => {
      try {
        // TODO(burdon): Bug where guest may create multiple connections <== is this still true with teleport?
        if (++this._connectionCount > 1) {
          throw new Error(`multiple connections detected: ${this._connectionCount}`);
        }

        log('connected', { guest: this._signingContext.deviceKey });
        this._observable.callback.onConnected?.(this._invitation);

        // 1. Introduce guest to host.
        log('introduce', { guest: this._signingContext.deviceKey });
        await this.rpc.SpaceHostService.introduce({
          profile: this._signingContext.profile
        });

        // 2. Get authentication code.
        // TODO(burdon): Test timeout (options for timeouts at different steps).
        if (this._invitation.type === undefined || this._invitation.type === Invitation.Type.INTERACTIVE) {
          const { timeout = INVITATION_TIMEOUT } = this._options ?? {};

          for (let attempt = 1; attempt <= MAX_OTP_ATTEMPTS; attempt++) {
            log('guest waiting for authentication code...');
            this._observable.callback.onAuthenticating?.(this._invitation);
            const authenticationCode = await this.authenticated.wait({ timeout });

            log('sending authentication request');
            const response = await this.rpc.SpaceHostService.authenticate({ authenticationCode });
            if (response.status === undefined || response.status === AuthenticationResponse.Status.OK) {
              break;
            }

            if (response.status === AuthenticationResponse.Status.INVALID_OTP) {
              if (attempt === MAX_OTP_ATTEMPTS) {
                throw new Error(`Maximum retry attempts: ${MAX_OTP_ATTEMPTS}`);
              } else {
                log('retrying invalid code', { attempt });
                this.authenticated.reset();
              }
            }
          }
        }

        // 3. Generate a pair of keys for our feeds.
        const controlFeedKey = await this._keyring.createKey();
        const dataFeedKey = await this._keyring.createKey();

        // 4. Send admission credentials to host (with local space keys).
        log('request admission', { guest: this._signingContext.deviceKey });
        const { credential } = await this.rpc.SpaceHostService.requestAdmission({
          identityKey: this._signingContext.identityKey,
          deviceKey: this._signingContext.deviceKey,
          controlFeedKey,
          dataFeedKey
        });

        // TODO(dmaretskyi): Record credential in guest's HALO.

        // 4. Create local space.
        const assertion = getCredentialAssertion(credential);
        assert(assertion['@type'] === 'dxos.halo.credentials.SpaceMember', 'Invalid credential');
        assert(credential.subject.id.equals(this._signingContext.identityKey));

        const space = await this._spaceManager.acceptSpace({
          spaceKey: assertion.spaceKey,
          genesisFeedKey: assertion.genesisFeedKey,
          controlFeedKey,
          dataFeedKey
        });

        // 5. Success.
        log('admitted by host', { guest: this._signingContext.deviceKey, spaceKey: space.key });
        this.complete.wake();
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
}
