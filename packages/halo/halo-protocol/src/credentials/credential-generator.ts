//
// Copyright 2022 DXOS.org
//

import { Signer } from '@dxos/keyring';
import { PublicKey } from '@dxos/protocols';

import { AdmittedFeed, Credential, PartyMember } from '../proto';
import { createCredential } from './credential-factory';

// TODO(burdon): Normalize partyKey, spaceKey (args, proto).

/**
 * Utility class for generating credential messages, where the issuer is the current identity or device.
 */
export class CredentialGenerator {
  constructor (
    private readonly _keyring: Signer,
    private readonly _identityKey: PublicKey,
    private readonly _deviceKey: PublicKey
  ) {}

  /**
   * Create genesis messages for new Space.
   */
  async createSpaceGenesis (
    partyKey: PublicKey,
    controlKey: PublicKey
  ): Promise<Credential[]> {
    return [
      await createCredential({
        keyring: this._keyring,
        issuer: partyKey,
        subject: partyKey,
        assertion: {
          '@type': 'dxos.halo.credentials.PartyGenesis',
          partyKey
        }
      }),

      await createCredential({
        keyring: this._keyring,
        issuer: partyKey,
        subject: this._identityKey,
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        }
      }),

      await this.createFeedAdmission(partyKey, controlKey, AdmittedFeed.Designation.CONTROL)
    ];
  }

  /**
   * Create invitation.
   * Admit identity and control and data feeds.
   */
  async createMemberInvitation (
    partyKey: PublicKey,
    identityKey: PublicKey,
    deviceKey: PublicKey,
    controlKey: PublicKey,
    dataKey: PublicKey
  ): Promise<Credential[]> {
    return [
      await createCredential({
        keyring: this._keyring,
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
  async createDeviceAuthorization (
    deviceKey: PublicKey
  ): Promise<Credential> {
    return createCredential({
      keyring: this._keyring,
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
  async createFeedAdmission (
    partyKey: PublicKey,
    feedKey: PublicKey,
    designation: AdmittedFeed.Designation
  ): Promise<Credential> {
    return createCredential({
      keyring: this._keyring,
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
