//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { PushStream, scheduleTask, sleep, Trigger } from '@dxos/async';
import {
  AUTHENTICATION_CODE_LENGTH,
  CancellableInvitationObservable,
  INVITATION_TIMEOUT,
  ON_CLOSE_DELAY,
  AuthenticatingInvitationObservable
} from '@dxos/client';
import { Context } from '@dxos/context';
import { createAdmissionCredentials, generatePasscode, getCredentialAssertion } from '@dxos/credentials';
import { SigningContext } from '@dxos/echo-pipeline';
import { writeMessages } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createTeleportProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { schema } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
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

import { Identity, JoinIdentityParams } from '../identity';
import { DataSpaceManager } from '../spaces';

const MAX_OTP_ATTEMPTS = 3;

// TODO(wittjosiah): Rename.
export interface InvitationsHandler {
  // Host
  getInvitationContext(): Partial<Invitation> & { kind: Invitation.Kind };
  admit(request: AdmissionRequest, guestProfile?: ProfileDocument): Promise<AdmissionResponse>;

  // Guest
  createIntroduction(): IntroductionRequest;
  createAdmissionRequest(): Promise<AdmissionRequest>;
  accept(response: AdmissionResponse, request: AdmissionRequest): Promise<Partial<Invitation>>;

  // Debugging
  toJSON(): object;
}

export class SpaceInvitationsHandler implements InvitationsHandler {
  constructor(
    private readonly _spaceManager: DataSpaceManager,
    private readonly _signingContext: SigningContext,
    private readonly _keyring: Keyring,
    private readonly _spaceKey?: PublicKey
  ) {}

  getInvitationContext(): Partial<Invitation> & { kind: Invitation.Kind } {
    return {
      kind: Invitation.Kind.SPACE,
      spaceKey: this._spaceKey
    };
  }

  async admit(request: AdmissionRequest, guestProfile?: ProfileDocument | undefined): Promise<AdmissionResponse> {
    assert(this._spaceKey);
    const space = await this._spaceManager.spaces.get(this._spaceKey);
    assert(space);

    assert(request.space);
    const { identityKey, deviceKey } = request.space;

    log('writing guest credentials', { host: this._signingContext.deviceKey, guest: deviceKey });
    // TODO(burdon): Check if already admitted.
    const credentials: FeedMessage.Payload[] = await createAdmissionCredentials(
      this._signingContext.credentialSigner,
      identityKey,
      space.key,
      space.inner.genesisFeedKey,
      guestProfile
    );

    // TODO(dmaretskyi): Refactor.
    assert(credentials[0].credential);
    const spaceMemberCredential = credentials[0].credential.credential;
    assert(getCredentialAssertion(spaceMemberCredential)['@type'] === 'dxos.halo.credentials.SpaceMember');

    await writeMessages(space.inner.controlPipeline.writer, credentials);

    return {
      space: {
        credential: spaceMemberCredential,
        controlTimeframe: space.inner.controlPipeline.state.timeframe,
        dataTimeframe: space.dataPipeline.pipelineState?.timeframe
      }
    };
  }

  createIntroduction(): IntroductionRequest {
    return {
      profile: this._signingContext.profile
    };
  }

  async createAdmissionRequest(): Promise<AdmissionRequest> {
    // Generate a pair of keys for our feeds.
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();

    return {
      space: {
        identityKey: this._signingContext.identityKey,
        deviceKey: this._signingContext.deviceKey,
        controlFeedKey,
        dataFeedKey
      }
    };
  }

  async accept(response: AdmissionResponse): Promise<Partial<Invitation>> {
    assert(response.space);
    const { credential, controlTimeframe, dataTimeframe } = response.space;
    const assertion = getCredentialAssertion(credential);
    assert(assertion['@type'] === 'dxos.halo.credentials.SpaceMember', 'Invalid credential');
    assert(credential.subject.id.equals(this._signingContext.identityKey));

    // Create local space.
    await this._spaceManager.acceptSpace({
      spaceKey: assertion.spaceKey,
      genesisFeedKey: assertion.genesisFeedKey,
      controlTimeframe,
      dataTimeframe
    });

    await this._signingContext.recordCredential(credential);

    return { spaceKey: assertion.spaceKey };
  }

  toJSON(): object {
    return {
      deviceKey: this._signingContext.deviceKey,
      spaceKey: this._spaceKey
    };
  }
}

export class DeviceInvitationsHandler implements InvitationsHandler {
  constructor(
    private readonly _keyring: Keyring,
    private readonly _getIdentity: () => Identity,
    private readonly _acceptIdentity: (identity: JoinIdentityParams) => Promise<Identity>
  ) {}

  getInvitationContext(): Partial<Invitation> & { kind: Invitation.Kind } {
    return {
      kind: Invitation.Kind.DEVICE
    };
  }

  async admit(request: AdmissionRequest): Promise<AdmissionResponse> {
    assert(request.device);
    const identity = this._getIdentity();
    await identity.admitDevice(request.device);

    return {
      device: {
        identityKey: identity.identityKey,
        haloSpaceKey: identity.haloSpaceKey,
        genesisFeedKey: identity.haloGenesisFeedKey,
        controlTimeframe: identity.controlPipeline.state.timeframe
      }
    };
  }

  createIntroduction(): IntroductionRequest {
    return {};
  }

  async createAdmissionRequest(): Promise<AdmissionRequest> {
    const deviceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();

    return {
      device: {
        deviceKey,
        controlFeedKey,
        dataFeedKey
      }
    };
  }

  async accept(response: AdmissionResponse, request: AdmissionRequest): Promise<Partial<Invitation>> {
    assert(response.device);
    const { identityKey, haloSpaceKey, genesisFeedKey, controlTimeframe } = response.device;

    assert(request.device);
    const { deviceKey, controlFeedKey, dataFeedKey } = request.device;

    await this._acceptIdentity({
      identityKey,
      deviceKey,
      haloSpaceKey,
      haloGenesisFeedKey: genesisFeedKey,
      controlFeedKey,
      dataFeedKey,
      controlTimeframe
    });

    return { identityKey };
  }

  toJSON(): object {
    // TODO(wittjosiah): What is helpful to include here?
    return {};
  }
}

/**
 * Generic handler for Halo and Space invitations.
 * Handles the life-cycle of invitations between peers.
 *
 * Host
 * - Creates an invitation containing a swarm topic (which can be shared via a URL, QR code, or direct message).
 * - Joins the swarm with the topic and waits for guest's introduction.
 * - Wait for guest to authenticate with OTP.
 * - Waits for guest to present credentials (containing local device and feed keys).
 * - Writes credentials to control feed then exits.
 *
 * Guest
 * - Joins the swarm with the topic.
 * - Sends an introduction.
 * - Sends authentication OTP.
 * - If Space handler then creates a local cloned space (with genesis block).
 * - Sends admission credentials.
 *
 * TODO(burdon): Show proxy/service relationship and reference design doc/diagram.
 *
 *  ```
 *  [Guest]                                          [Host]
 *   |------------------------------------Introduce-->|
 *   |-------------------------------[Authenticate]-->|
 *   |----------------------------------------Admit-->|
 *  ```
 */
// TODO(wittjosiah): Rename to InvitationsHandler.
export class GenericInvitationsHandler {
  constructor(private readonly _networkManager: NetworkManager) {}

  createInvitation(handler: InvitationsHandler, options?: Partial<Invitation>): CancellableInvitationObservable {
    const {
      invitationId = PublicKey.random().toHex(),
      type = Invitation.Type.INTERACTIVE,
      authMethod = Invitation.AuthMethod.SHARED_SECRET,
      state = Invitation.State.INIT,
      timeout = INVITATION_TIMEOUT,
      swarmKey = PublicKey.random()
    } = options ?? {};
    const authenticationCode =
      options?.authenticationCode ??
      (authMethod === Invitation.AuthMethod.SHARED_SECRET ? generatePasscode(AUTHENTICATION_CODE_LENGTH) : undefined);
    assert(handler);

    const invitation: Invitation = {
      invitationId,
      type,
      authMethod,
      state,
      swarmKey,
      authenticationCode,
      ...handler.getInvitationContext()
    };

    // TODO(wittjosiah): Fire complete event?
    const stream = new PushStream<Invitation>();
    const ctx = new Context({
      onError: (err) => {
        void ctx.dispose();
        stream.error(err);
      }
    });

    // Called for every connecting peer.
    const createExtension = (): InvitationHostExtension => {
      const complete = new Trigger<PublicKey>();
      let guestProfile: ProfileDocument | undefined;
      let authenticationPassed = false;
      let authenticationRetry = 0;

      const extension = new InvitationHostExtension({
        introduce: async ({ profile }) => {
          log('guest introduced itself', {
            guestProfile: profile,
            handler: handler.toString()
          });

          guestProfile = profile;

          // TODO(burdon): Is this the right place to set this state?
          // TODO(dmaretskyi): Should we expose guest's profile in this callback?
          stream.next({ ...invitation, state: Invitation.State.AUTHENTICATING });

          return {
            spaceKey: authMethod === Invitation.AuthMethod.NONE ? handler.getInvitationContext().spaceKey : undefined,
            authMethod
          };
        },

        authenticate: async ({ authenticationCode: code }) => {
          log('received authentication request', { authenticationCode: code });
          let status = AuthenticationResponse.Status.OK;

          switch (invitation.authMethod) {
            case Invitation.AuthMethod.NONE: {
              log('authentication not required');
              return { status: AuthenticationResponse.Status.OK };
            }

            case Invitation.AuthMethod.SHARED_SECRET: {
              if (invitation.authenticationCode) {
                if (authenticationRetry++ > MAX_OTP_ATTEMPTS) {
                  status = AuthenticationResponse.Status.INVALID_OPT_ATTEMPTS;
                } else if (code !== invitation.authenticationCode) {
                  status = AuthenticationResponse.Status.INVALID_OTP;
                } else {
                  authenticationPassed = true;
                }
              }
              break;
            }

            default: {
              log.error('invalid authentication method', { authMethod: invitation.authMethod });
              status = AuthenticationResponse.Status.INTERNAL_ERROR;
              break;
            }
          }

          return { status };
        },

        admit: async (admissionRequest) => {
          try {
            // Check authenticated.
            if (isAuthenticationRequired(invitation) && !authenticationPassed) {
              throw new Error('Not authenticated');
            }

            const deviceKey = admissionRequest.device?.deviceKey ?? admissionRequest.space?.deviceKey;
            assert(deviceKey);
            const admissionResponse = await handler.admit(admissionRequest, guestProfile);

            // Updating credentials complete.
            complete.wake(deviceKey);

            return admissionResponse;
          } catch (err: any) {
            // TODO(burdon): Generic RPC callback to report error to client.
            stream.error(err);
            throw err; // Propagate error to guest.
          }
        },

        onOpen: () => {
          scheduleTask(ctx, async () => {
            try {
              log('connected', { ...handler.toJSON() });
              stream.next({ ...invitation, state: Invitation.State.CONNECTED });
              const deviceKey = await complete.wait({ timeout });
              log('admitted guest', { guest: deviceKey, ...handler.toJSON() });
              stream.next({ ...invitation, state: Invitation.State.SUCCESS });
            } catch (err: any) {
              log.error('failed', err);
              stream.error(err);
            } finally {
              if (type !== Invitation.Type.MULTIUSE) {
                await sleep(ON_CLOSE_DELAY);
                await ctx.dispose();
              }
            }
          });
        }
      });

      return extension;
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

      stream.next({ ...invitation, state: Invitation.State.CONNECTING });
    });

    // TODO(burdon): Stop anything pending.
    const observable = new CancellableInvitationObservable({
      initialInvitation: invitation,
      subscriber: stream.observable,
      onCancel: async () => {
        stream.next({ ...invitation, state: Invitation.State.CANCELLED });
        await ctx.dispose();
      }
    });

    return observable;
  }

  acceptInvitation(handler: InvitationsHandler, invitation: Invitation): AuthenticatingInvitationObservable {
    const { timeout = INVITATION_TIMEOUT } = invitation;
    assert(handler);

    const complete = new Trigger<Partial<Invitation>>();
    const authenticated = new Trigger<string>();

    const stream = new PushStream<Invitation>();
    const ctx = new Context({
      onError: (err) => {
        void ctx.dispose();
        stream.error(err);
      }
    });

    const createExtension = (): InvitationGuestExtension => {
      let connectionCount = 0;

      const extension = new InvitationGuestExtension({
        onOpen: () => {
          scheduleTask(ctx, async () => {
            try {
              // TODO(burdon): Bug where guest may create multiple connections.
              if (++connectionCount > 1) {
                throw new Error(`multiple connections detected: ${connectionCount}`);
              }

              log('connected', { ...handler.toJSON() });
              stream.next({ ...invitation, state: Invitation.State.CONNECTED });

              // 1. Introduce guest to host.
              log('introduce', { ...handler.toJSON() });
              const introductionResponse = await extension.rpc.InvitationHostService.introduce(
                handler.createIntroduction()
              );
              log('introduce response', { ...handler.toJSON(), response: introductionResponse });
              invitation.authMethod = introductionResponse.authMethod;
              if (introductionResponse.spaceKey) {
                invitation.spaceKey = introductionResponse.spaceKey;
              }

              // TODO(dmaretskyi): Add a callback here to notify that we have introduced ourselves to the host (regardless of auth requirements).

              // 2. Get authentication code.
              // TODO(burdon): Test timeout (options for timeouts at different steps).
              if (isAuthenticationRequired(invitation)) {
                stream.next({ ...invitation, state: Invitation.State.AUTHENTICATING });

                for (let attempt = 1; attempt <= MAX_OTP_ATTEMPTS; attempt++) {
                  log('guest waiting for authentication code...');
                  stream.next({ ...invitation, state: Invitation.State.AUTHENTICATING });
                  const authenticationCode = await authenticated.wait({ timeout });

                  log('sending authentication request');
                  const response = await extension.rpc.InvitationHostService.authenticate({ authenticationCode });
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

              // 3. Send admission credentials to host (with local space keys).
              log('request admission', { ...handler.toJSON() });
              const admissionRequest = await handler.createAdmissionRequest();
              const admissionResponse = await extension.rpc.InvitationHostService.admit(admissionRequest);

              // 4. Record credential in our HALO.
              const result = await handler.accept(admissionResponse, admissionRequest);

              // 5. Success.
              log('admitted by host', { ...handler.toJSON() });
              complete.wake(result);
            } catch (err: any) {
              log.warn('auth failed', err);
              stream.error(err);
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

      stream.next({ ...invitation, state: Invitation.State.CONNECTING });
      const result = await complete.wait();
      stream.next({ ...invitation, ...result, state: Invitation.State.SUCCESS });
      await ctx.dispose();
    });

    const observable = new AuthenticatingInvitationObservable({
      initialInvitation: invitation,
      subscriber: stream.observable,
      onCancel: async () => {
        stream.next({ ...invitation, state: Invitation.State.CANCELLED });
        await ctx.dispose();
      },
      onAuthenticate: async (code: string) => {
        // TODO(burdon): Reset creates a race condition? Event?
        authenticated.wake(code);
      }
    });

    return observable;
  }
}

const isAuthenticationRequired = (invitation: Invitation) => invitation.authMethod !== Invitation.AuthMethod.NONE;

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
class InvitationHostExtension extends RpcExtension<{}, { InvitationHostService: InvitationHostService }> {
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
          return this._callbacks.introduce(request);
        },

        authenticate: async (request) => {
          return this._callbacks.authenticate(request);
        },

        admit: async (request) => {
          return this._callbacks.admit(request);
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
class InvitationGuestExtension extends RpcExtension<{ InvitationHostService: InvitationHostService }, {}> {
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
