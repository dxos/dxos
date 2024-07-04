//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { AUTH_TIMEOUT, LOAD_CONTROL_FEEDS_TIMEOUT } from '@dxos/client-protocol';
import { type Context } from '@dxos/context';
import {
  DeviceStateMachine,
  type CredentialSigner,
  createCredentialSignerWithKey,
  createCredentialSignerWithChain,
  ProfileStateMachine,
} from '@dxos/credentials';
import { type Signer } from '@dxos/crypto';
import { type Space } from '@dxos/echo-pipeline';
import { writeMessages } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import {
  AdmittedFeed,
  type DeviceProfileDocument,
  type ProfileDocument,
} from '@dxos/protocols/proto/dxos/halo/credentials';
import { type DeviceAdmissionRequest } from '@dxos/protocols/proto/dxos/halo/invitations';
import { type Presence } from '@dxos/teleport-extension-gossip';
import { Timeframe } from '@dxos/timeframe';
import { trace } from '@dxos/tracing';
import { type ComplexMap, ComplexSet } from '@dxos/util';

import { TrustedKeySetAuthVerifier } from './authenticator';
import { DefaultSpaceStateMachine } from './default-space-state-machine';

export type IdentityParams = {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  signer: Signer;
  space: Space;
  presence?: Presence;
};

/**
 * Agent identity manager, which includes the agent's Halo space.
 */
@trace.resource()
export class Identity {
  public readonly space: Space;
  private readonly _signer: Signer;
  private readonly _presence?: Presence;
  private readonly _deviceStateMachine: DeviceStateMachine;
  private readonly _profileStateMachine: ProfileStateMachine;
  private readonly _defaultSpaceStateMachine: DefaultSpaceStateMachine;
  public readonly authVerifier: TrustedKeySetAuthVerifier;

  public readonly identityKey: PublicKey;
  public readonly deviceKey: PublicKey;

  public readonly stateUpdate = new Event();

  constructor({ space, signer, identityKey, deviceKey, presence }: IdentityParams) {
    this.space = space;
    this._signer = signer;
    this._presence = presence;

    this.identityKey = identityKey;
    this.deviceKey = deviceKey;

    log.trace('dxos.halo.device', { deviceKey });

    this._deviceStateMachine = new DeviceStateMachine({
      identityKey: this.identityKey,
      deviceKey: this.deviceKey,
      onUpdate: () => this.stateUpdate.emit(),
    });
    this._profileStateMachine = new ProfileStateMachine({
      identityKey: this.identityKey,
      onUpdate: () => this.stateUpdate.emit(),
    });
    this._defaultSpaceStateMachine = new DefaultSpaceStateMachine({
      identityKey: this.identityKey,
      onUpdate: () => this.stateUpdate.emit(),
    });

    this.authVerifier = new TrustedKeySetAuthVerifier({
      trustedKeysProvider: () => new ComplexSet(PublicKey.hash, this.authorizedDeviceKeys.keys()),
      update: this.stateUpdate,
      authTimeout: AUTH_TIMEOUT,
    });
  }

  // TODO(burdon): Expose state object?
  get authorizedDeviceKeys(): ComplexMap<PublicKey, DeviceProfileDocument> {
    return this._deviceStateMachine.authorizedDeviceKeys;
  }

  get defaultSpaceId(): SpaceId | undefined {
    return this._defaultSpaceStateMachine.spaceId;
  }

  @trace.span()
  async open(ctx: Context) {
    await this._presence?.open();
    await this.space.spaceState.addCredentialProcessor(this._deviceStateMachine);
    await this.space.spaceState.addCredentialProcessor(this._profileStateMachine);
    await this.space.spaceState.addCredentialProcessor(this._defaultSpaceStateMachine);
    await this.space.open(ctx);
  }

  @trace.span()
  async close(ctx: Context) {
    await this._presence?.close();
    await this.authVerifier.close();
    await this.space.spaceState.removeCredentialProcessor(this._defaultSpaceStateMachine);
    await this.space.spaceState.removeCredentialProcessor(this._profileStateMachine);
    await this.space.spaceState.removeCredentialProcessor(this._deviceStateMachine);
    await this.space.close();
  }

  async ready() {
    await this._deviceStateMachine.deviceChainReady.wait();

    await this.controlPipeline.state.waitUntilReachedTargetTimeframe({ timeout: LOAD_CONTROL_FEEDS_TIMEOUT });
  }

  get profileDocument(): ProfileDocument | undefined {
    return this._profileStateMachine.profile;
  }

  /**
   * @test-only
   */
  get controlPipeline() {
    return this.space.controlPipeline;
  }

  get haloSpaceKey() {
    return this.space.key;
  }

  get haloGenesisFeedKey() {
    return this.space.genesisFeedKey;
  }

  get deviceCredentialChain() {
    return this._deviceStateMachine.deviceCredentialChain;
  }

  get presence() {
    return this._presence;
  }

  /**
   * Issues credentials as identity.
   * Requires identity to be ready.
   */
  getIdentityCredentialSigner(): CredentialSigner {
    invariant(this._deviceStateMachine.deviceCredentialChain, 'Device credential chain is not ready.');
    return createCredentialSignerWithChain(
      this._signer,
      this._deviceStateMachine.deviceCredentialChain,
      this.deviceKey,
    );
  }

  /**
   * Issues credentials as device.
   */
  getDeviceCredentialSigner(): CredentialSigner {
    return createCredentialSignerWithKey(this._signer, this.deviceKey);
  }

  async updateDefaultSpace(spaceId: SpaceId) {
    const credential = await this.getDeviceCredentialSigner().createCredential({
      subject: this.identityKey,
      assertion: { '@type': 'dxos.halo.credentials.DefaultSpace', spaceId },
    });
    const receipt = await this.controlPipeline.writer.write({ credential: { credential } });
    await this.controlPipeline.state.waitUntilTimeframe(new Timeframe([[receipt.feedKey, receipt.seq]]));
  }

  async admitDevice({ deviceKey, controlFeedKey, dataFeedKey }: DeviceAdmissionRequest) {
    log('Admitting device:', {
      identityKey: this.identityKey,
      hostDevice: this.deviceKey,
      deviceKey,
      controlFeedKey,
      dataFeedKey,
    });
    const signer = this.getIdentityCredentialSigner();
    await writeMessages(
      this.controlPipeline.writer,
      [
        await signer.createCredential({
          subject: deviceKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            identityKey: this.identityKey,
            deviceKey,
          },
        }),
        await signer.createCredential({
          subject: controlFeedKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            spaceKey: this.haloSpaceKey,
            deviceKey,
            identityKey: this.identityKey,
            designation: AdmittedFeed.Designation.CONTROL,
          },
        }),
        await signer.createCredential({
          subject: dataFeedKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            spaceKey: this.haloSpaceKey,
            deviceKey,
            identityKey: this.identityKey,
            designation: AdmittedFeed.Designation.DATA,
          },
        }),
      ].map((credential): FeedMessage.Payload => ({ credential: { credential } })),
    );
  }
}
