//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import {
  DeviceStateMachine,
  CredentialSigner,
  createCredentialSignerWithKey,
  createCredentialSignerWithChain,
  ProfileStateMachine,
  CredentialConsumer
} from '@dxos/credentials';
import { Signer } from '@dxos/crypto';
import { failUndefined } from '@dxos/debug';
import { Space } from '@dxos/echo-db';
import { writeMessages } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { AdmittedFeed, ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { HaloAdmissionCredentials } from '@dxos/protocols/proto/dxos/halo/invitations';
import { ComplexSet } from '@dxos/util';

import { TrustedKeySetAuthVerifier } from './authenticator';

/**
 * Timeout for the device to be added to the trusted set during auth.
 */
const AUTH_TIMEOUT = 30000;

export type IdentityParams = {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  signer: Signer;
  space: Space;
};

/**
 * Agent identity manager, which includes the agent's Halo space.
 */
export class Identity {
  public readonly space: Space;
  private readonly _signer: Signer;
  private readonly _deviceStateMachine: CredentialConsumer<DeviceStateMachine>;
  private readonly _profileStateMachine: CredentialConsumer<ProfileStateMachine>;
  public readonly authVerifier: TrustedKeySetAuthVerifier;

  public readonly identityKey: PublicKey;
  public readonly deviceKey: PublicKey;

  public readonly stateUpdate = new Event();

  constructor({ space, signer, identityKey, deviceKey }: IdentityParams) {
    this.space = space;
    this._signer = signer;

    this.identityKey = identityKey;
    this.deviceKey = deviceKey;

    this._deviceStateMachine = this.space.spaceState.registerProcessor(
      new DeviceStateMachine({
        identityKey: this.identityKey,
        deviceKey: this.deviceKey,
        onUpdate: () => this.stateUpdate.emit()
      })
    );
    this._profileStateMachine = this.space.spaceState.registerProcessor(
      new ProfileStateMachine({
        identityKey: this.identityKey,
        onUpdate: () => this.stateUpdate.emit()
      })
    );

    this.authVerifier = new TrustedKeySetAuthVerifier({
      trustedKeysProvider: () => this.authorizedDeviceKeys,
      update: this.stateUpdate,
      authTimeout: AUTH_TIMEOUT
    });
  }

  // TODO(burdon): Expose state object?
  get authorizedDeviceKeys(): ComplexSet<PublicKey> {
    return this._deviceStateMachine.processor.authorizedDeviceKeys;
  }

  async open() {
    await this._deviceStateMachine.open();
    await this._profileStateMachine.open();
    await this.space.open();
  }

  async close() {
    await this.authVerifier.close();
    await this._deviceStateMachine.close();
    await this._profileStateMachine.close();
    await this.space.close();
  }

  async ready() {
    await this._deviceStateMachine.processor.deviceChainReady.wait();

    // TODO(dmaretskyi): Should we also wait for our feeds to be admitted?
  }

  get profileDocument(): ProfileDocument | undefined {
    return this._profileStateMachine.processor.profile;
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

  getAdmissionCredentials(): HaloAdmissionCredentials {
    return {
      deviceKey: this.deviceKey,
      controlFeedKey: this.space.controlFeedKey ?? failUndefined(),
      dataFeedKey: this.space.dataFeedKey ?? failUndefined()
    };
  }

  /**
   * Issues credentials as identity.
   * Requires identity to be ready.
   */
  getIdentityCredentialSigner(): CredentialSigner {
    assert(this._deviceStateMachine.processor.deviceCredentialChain, 'Device credential chain is not ready.');
    return createCredentialSignerWithChain(
      this._signer,
      this._deviceStateMachine.processor.deviceCredentialChain,
      this.deviceKey
    );
  }

  /**
   * Issues credentials as device.
   */
  getDeviceCredentialSigner(): CredentialSigner {
    return createCredentialSignerWithKey(this._signer, this.deviceKey);
  }

  async admitDevice({ deviceKey, controlFeedKey, dataFeedKey }: HaloAdmissionCredentials) {
    log('Admitting device:', {
      identityKey: this.identityKey,
      hostDevice: this.deviceKey,
      deviceKey,
      controlFeedKey,
      dataFeedKey
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
            deviceKey
          }
        }),
        await signer.createCredential({
          subject: controlFeedKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            spaceKey: this.haloSpaceKey,
            deviceKey,
            identityKey: this.identityKey,
            designation: AdmittedFeed.Designation.CONTROL
          }
        }),
        await signer.createCredential({
          subject: dataFeedKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            spaceKey: this.haloSpaceKey,
            deviceKey,
            identityKey: this.identityKey,
            designation: AdmittedFeed.Designation.DATA
          }
        })
      ].map((credential): FeedMessage.Payload => ({ credential: { credential } }))
    );
  }
}
