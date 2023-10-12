//
// Copyright 2022 DXOS.org
//

import { Signer } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { TypedMessage } from '@dxos/protocols';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import {
  AdmittedFeed,
  Credential,
  DeviceProfileDocument,
  ProfileDocument,
  SpaceMember,
} from '@dxos/protocols/proto/dxos/halo/credentials';
import { Timeframe } from '@dxos/timeframe';

import { createCredential, CredentialSigner } from './credential-factory';

// TODO(burdon): Normalize generate and functions below.
//  Use throughout stack and in tests.

/**
 * Utility class for generating credential messages, where the issuer is the current identity or device.
 */
export class CredentialGenerator {
  constructor(
    private readonly _signer: Signer,
    private readonly _identityKey: PublicKey,
    private readonly _deviceKey: PublicKey,
  ) {}

  /**
   * Create genesis messages for new Space.
   */
  async createSpaceGenesis(
    spaceKey: PublicKey,
    controlKey: PublicKey,
    creatorProfile?: ProfileDocument,
  ): Promise<Credential[]> {
    return [
      await createCredential({
        signer: this._signer,
        issuer: spaceKey,
        subject: spaceKey,
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceGenesis',
          spaceKey,
        },
      }),

      await createCredential({
        signer: this._signer,
        issuer: spaceKey,
        subject: this._identityKey,
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          profile: creatorProfile,
          genesisFeedKey: controlKey,
        },
      }),

      await this.createFeedAdmission(spaceKey, controlKey, AdmittedFeed.Designation.CONTROL),
    ];
  }

  /**
   * Create invitation.
   * Admit identity and control and data feeds.
   */
  // TODO(burdon): Reconcile with above (esp. Signer).
  async createMemberInvitation(
    spaceKey: PublicKey,
    identityKey: PublicKey,
    deviceKey: PublicKey,
    controlKey: PublicKey,
    dataKey: PublicKey,
    genesisFeedKey: PublicKey,
  ): Promise<Credential[]> {
    return [
      await createCredential({
        signer: this._signer,
        issuer: this._identityKey,
        subject: identityKey,
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.MEMBER,
          genesisFeedKey,
        },
      }),

      await this.createFeedAdmission(spaceKey, controlKey, AdmittedFeed.Designation.CONTROL),
      await this.createFeedAdmission(spaceKey, dataKey, AdmittedFeed.Designation.DATA),
    ];
  }

  /**
   * Add device to space.
   */
  // TODO(burdon): Reconcile with below.
  async createDeviceAuthorization(deviceKey: PublicKey): Promise<Credential> {
    return createCredential({
      signer: this._signer,
      issuer: this._identityKey,
      subject: deviceKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AuthorizedDevice',
        identityKey: this._identityKey,
        deviceKey,
      },
    });
  }

  /**
   * Add device metadata.
   */
  async createDeviceProfile(profile: DeviceProfileDocument): Promise<Credential> {
    return createCredential({
      signer: this._signer,
      issuer: this._identityKey,
      subject: this._deviceKey,
      assertion: {
        '@type': 'dxos.halo.credentials.DeviceProfile',
        profile,
      },
    });
  }

  /**
   * Add feed to space.
   */
  async createFeedAdmission(
    spaceKey: PublicKey,
    feedKey: PublicKey,
    designation: AdmittedFeed.Designation,
  ): Promise<Credential> {
    return createCredential({
      signer: this._signer,
      issuer: this._identityKey,
      subject: feedKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        spaceKey,
        identityKey: this._identityKey,
        deviceKey: this._deviceKey,
        designation,
      },
    });
  }

  async createProfileCredential(profile: ProfileDocument): Promise<Credential> {
    return createCredential({
      signer: this._signer,
      issuer: this._identityKey,
      subject: this._identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.IdentityProfile',
        profile,
      },
    });
  }

  async createEpochCredential(spaceKey: PublicKey): Promise<Credential> {
    return createCredential({
      signer: this._signer,
      issuer: this._identityKey,
      subject: spaceKey,
      assertion: {
        '@type': 'dxos.halo.credentials.Epoch',
        number: 0,
        timeframe: new Timeframe(),
      },
    });
  }
}

// TODO(burdon): Reconcile with above (esp. Signer).
export const createDeviceAuthorization = async (
  signer: CredentialSigner,
  identityKey: PublicKey,
  deviceKey: PublicKey,
): Promise<TypedMessage[]> => {
  const credentials = await Promise.all([
    await signer.createCredential({
      subject: deviceKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AuthorizedDevice',
        identityKey,
        deviceKey,
      },
    }),
  ]);

  return credentials.map((credential) => ({
    '@type': 'dxos.echo.feed.CredentialsMessage',
    credential,
  }));
};

// TODO(burdon): Reconcile with above (esp. Signer).
export const createAdmissionCredentials = async (
  signer: CredentialSigner,
  identityKey: PublicKey,
  spaceKey: PublicKey,
  genesisFeedKey: PublicKey,
  profile?: ProfileDocument,
): Promise<FeedMessage.Payload[]> => {
  const credentials = await Promise.all([
    await signer.createCredential({
      subject: identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.SpaceMember',
        spaceKey,
        role: SpaceMember.Role.ADMIN, // TODO(burdon): Configure.
        profile,
        genesisFeedKey,
      },
    }),
  ]);

  return credentials.map((credential) => ({
    credential: { credential },
  }));
};
