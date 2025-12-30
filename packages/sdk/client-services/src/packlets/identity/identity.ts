//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { AUTH_TIMEOUT, LOAD_CONTROL_FEEDS_TIMEOUT } from '@dxos/client-protocol';
import { type Context } from '@dxos/context';
import {
  type CredentialSigner,
  DeviceStateMachine,
  ProfileStateMachine,
  createCredentialSignerWithChain,
  createCredentialSignerWithKey,
} from '@dxos/credentials';
import { type Signer } from '@dxos/crypto';
import { type Space } from '@dxos/echo-pipeline';
import { type EdgeConnection } from '@dxos/edge-client';
import { type FeedWrapper, writeMessages } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type IdentityDid, PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import {
  AdmittedFeed,
  type Credential,
  type DeviceProfileDocument,
  type ProfileDocument,
} from '@dxos/protocols/proto/dxos/halo/credentials';
import { type DeviceAdmissionRequest } from '@dxos/protocols/proto/dxos/halo/invitations';
import { type Presence } from '@dxos/teleport-extension-gossip';
import { Timeframe } from '@dxos/timeframe';
import { trace } from '@dxos/tracing';
import { type ComplexMap, ComplexSet } from '@dxos/util';

import { EdgeFeedReplicator } from '../spaces';

import { TrustedKeySetAuthVerifier } from './authenticator';
import { DefaultSpaceStateMachine } from './default-space-state-machine';

export type IdentityProps = {
  did: IdentityDid;
  identityKey: PublicKey;
  deviceKey: PublicKey;
  signer: Signer;
  space: Space;
  presence?: Presence;

  edgeConnection?: EdgeConnection;
  edgeFeatures?: Runtime.Client.EdgeFeatures;
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
  private readonly _edgeFeedReplicator?: EdgeFeedReplicator = undefined;

  public readonly authVerifier: TrustedKeySetAuthVerifier;

  public readonly did: IdentityDid;
  public readonly identityKey: PublicKey;
  public readonly deviceKey: PublicKey;

  public readonly stateUpdate = new Event();

  constructor(params: IdentityProps) {
    this.space = params.space;
    this._signer = params.signer;
    this._presence = params.presence;

    this.did = params.did;
    this.identityKey = params.identityKey;
    this.deviceKey = params.deviceKey;

    log.trace('dxos.halo.device', { deviceKey: params.deviceKey });

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

    if (params.edgeConnection && params.edgeFeatures?.feedReplicator) {
      this._edgeFeedReplicator = new EdgeFeedReplicator({ messenger: params.edgeConnection, spaceId: this.space.id });
    }
  }

  // TODO(burdon): Expose state object?
  get authorizedDeviceKeys(): ComplexMap<PublicKey, DeviceProfileDocument> {
    return this._deviceStateMachine.authorizedDeviceKeys;
  }

  get defaultSpaceId(): SpaceId | undefined {
    return this._defaultSpaceStateMachine.spaceId;
  }

  @trace.span()
  async open(ctx: Context): Promise<void> {
    await this._presence?.open();
    await this.space.spaceState.addCredentialProcessor(this._deviceStateMachine);
    await this.space.spaceState.addCredentialProcessor(this._profileStateMachine);
    await this.space.spaceState.addCredentialProcessor(this._defaultSpaceStateMachine);
    if (this._edgeFeedReplicator) {
      this.space.protocol.feedAdded.append(this._onFeedAdded);
    }
    await this.space.open(ctx);
  }

  public async joinNetwork(): Promise<void> {
    await this.space.startProtocol();
    await this._edgeFeedReplicator?.open();
  }

  @trace.span()
  async close(ctx: Context): Promise<void> {
    await this._presence?.close();
    await this.authVerifier.close();
    await this.space.spaceState.removeCredentialProcessor(this._defaultSpaceStateMachine);
    await this.space.spaceState.removeCredentialProcessor(this._profileStateMachine);
    await this.space.spaceState.removeCredentialProcessor(this._deviceStateMachine);

    if (this._edgeFeedReplicator) {
      this.space.protocol.feedAdded.remove(this._onFeedAdded);
    }

    await this._edgeFeedReplicator?.close();

    await this.space.close();
  }

  async ready(): Promise<void> {
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

  get haloSpaceId() {
    return this.space.id;
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

  get signer() {
    return this._signer;
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

  async updateDefaultSpace(spaceId: SpaceId): Promise<void> {
    const credential = await this.getDeviceCredentialSigner().createCredential({
      subject: this.identityKey,
      assertion: { '@type': 'dxos.halo.credentials.DefaultSpace', spaceId },
    });
    const receipt = await this.controlPipeline.writer.write({ credential: { credential } });
    await this.controlPipeline.state.waitUntilTimeframe(new Timeframe([[receipt.feedKey, receipt.seq]]));
  }

  async admitDevice({ deviceKey, controlFeedKey, dataFeedKey }: DeviceAdmissionRequest): Promise<Credential> {
    log('Admitting device:', {
      identityKey: this.identityKey,
      hostDevice: this.deviceKey,
      deviceKey,
      controlFeedKey,
      dataFeedKey,
    });
    const signer = this.getIdentityCredentialSigner();
    const deviceCredential = await signer.createCredential({
      subject: deviceKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AuthorizedDevice',
        identityKey: this.identityKey,
        deviceKey,
      },
    });
    await writeMessages(
      this.controlPipeline.writer,
      [
        deviceCredential,
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

    return deviceCredential;
  }

  private _onFeedAdded = async (feed: FeedWrapper<any>) => {
    await this._edgeFeedReplicator!.addFeed(feed);
  };
}
