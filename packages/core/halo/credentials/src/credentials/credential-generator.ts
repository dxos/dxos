//
// Copyright 2022 DXOS.org
//

import { Signer } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { TypedMessage } from '@dxos/protocols';
import { AdmittedFeed, Credential, PartyMember } from '@dxos/protocols/proto/dxos/halo/credentials';

import { createCredential, CredentialSigner } from './credential-factory';

// TODO(burdon): Normalize party_key, space_key (args, proto).

/**
 * Utility class for generating credential messages, where the issuer is the current identity or device.
 */
export class CredentialGenerator {
  constructor(
    private readonly _keyring: Signer, // TODO(burdon): CredentialSigner.
    private readonly _identityKey: PublicKey,
    private readonly _deviceKey: PublicKey
  ) {}

  /**
   * Create genesis messages for new Space.
   */
  async createSpaceGenesis(spaceKey: PublicKey, controlKey: PublicKey): Promise<Credential[]> {
    return [
      await createCredential({
        signer: this._keyring,
        issuer: spaceKey,
        subject: spaceKey,
        assertion: {
          '@type': 'dxos.halo.credentials.PartyGenesis',
          partyKey: spaceKey
        }
      }),

      await createCredential({
        signer: this._keyring,
        issuer: spaceKey,
        subject: this._identityKey,
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey: spaceKey,
          role: PartyMember.Role.ADMIN
        }
      }),

      await this.createFeedAdmission(spaceKey, controlKey, AdmittedFeed.Designation.CONTROL)
    ];
  }

  /**
   * Create invitation.
   * Admit identity and control and data feeds.
   */
  async createMemberInvitation(
    partyKey: PublicKey,
    identityKey: PublicKey,
    deviceKey: PublicKey,
    controlKey: PublicKey,
    dataKey: PublicKey
  ): Promise<Credential[]> {
    return [
      await createCredential({
        signer: this._keyring,
        issuer: this._identityKey,
        subject: identityKey,
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.MEMBER
        }
      }),

      await this.createFeedAdmission(partyKey, controlKey, AdmittedFeed.Designation.CONTROL),
      await this.createFeedAdmission(partyKey, dataKey, AdmittedFeed.Designation.DATA)
    ];
  }

  /**
   * Add device to space.
   */
  async createDeviceAuthorization(deviceKey: PublicKey): Promise<Credential> {
    return createCredential({
      signer: this._keyring,
      issuer: this._identityKey,
      subject: deviceKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AuthorizedDevice',
        identityKey: this._identityKey,
        deviceKey
      }
    });
  }

  /**
   * Add feed to space.
   */
  async createFeedAdmission(
    partyKey: PublicKey,
    feedKey: PublicKey,
    designation: AdmittedFeed.Designation
  ): Promise<Credential> {
    return createCredential({
      signer: this._keyring,
      issuer: this._identityKey,
      subject: feedKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey,
        identityKey: this._identityKey,
        deviceKey: this._deviceKey,
        designation
      }
    });
  }
}

// TODO(burdon): Reconcile with above (esp. Signer).
export const createAdmissionCredentials = async (
  signer: CredentialSigner,
  identityKey: PublicKey,
  deviceKey: PublicKey,
  spaceKey: PublicKey,
  controlFeedKey: PublicKey,
  dataFeedKey: PublicKey
): Promise<TypedMessage[]> => {
  const credentials = await Promise.all([
    await signer.createCredential({
      subject: identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyMember',
        partyKey: spaceKey,
        role: PartyMember.Role.ADMIN // TODO(burdon): Configure.
      }
    }),

    await signer.createCredential({
      subject: controlFeedKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: spaceKey,
        deviceKey,
        identityKey,
        designation: AdmittedFeed.Designation.CONTROL
      }
    }),

    await signer.createCredential({
      subject: dataFeedKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: spaceKey,
        deviceKey,
        identityKey,
        designation: AdmittedFeed.Designation.DATA
      }
    })
  ]);

  return credentials.map((credential) => ({
    '@type': 'dxos.echo.feed.CredentialsMessage',
    credential
  }));
};
