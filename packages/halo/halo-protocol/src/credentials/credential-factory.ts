//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Keyring, Signer } from '@dxos/keyring';
import { PublicKey } from '@dxos/protocols';

import { AdmittedFeed, Chain, Credential, PartyMember } from '../proto';
import { getSignaturePayload, sign } from './signing';
import { MessageType } from './types';
import { SIGNATURE_TYPE_ED25519 } from './verifier';

export type CreateCredentialParams = {
  keyring: Signer
  issuer: PublicKey
  subject: PublicKey
  assertion: MessageType
  /**
   * Provided if different from issuer.
   */
  signingKey?: PublicKey
  /**
   * Provided if signing key is different from issuer.
   */
  chain?: Chain
  nonce?: Uint8Array
}

/**
 * Construct signed credential message.
 */
// TODO(burdon): Make private and use CredentialGenerator.
// TODO(burdon): Destructure params.
export const createCredential = async (params: CreateCredentialParams): Promise<Credential> => {
  assert(params.assertion['@type'], 'Invalid assertion.');
  assert(!!params.signingKey === !!params.chain, 'Chain must be provided if and only if the signing key differs from the issuer.');

  // TODO(dmaretskyi): Verify chain.

  const signingKey = params.signingKey ?? params.issuer;

  // Form a temporary credential with signature fields missing. This will act as an input data for the signature.
  const credential: Credential = {
    subject: {
      id: params.subject,
      assertion: params.assertion
    },
    issuer: params.issuer,
    issuanceDate: new Date(),
    proof: {
      type: SIGNATURE_TYPE_ED25519,
      creationDate: new Date(),
      signer: signingKey,
      nonce: params.nonce,
      value: new Uint8Array(),
      chain: undefined
    }
  };

  const signedPayload = getSignaturePayload(credential);
  credential.proof.value = await sign(params.keyring, signingKey, signedPayload);
  if (params.chain) {
    credential.proof.chain = params.chain;
  }

  return credential;
};

/**
 * Utility class for generating credential messages, where the issuer is the current identity or device.
 */
// TODO(burdon): Normalize partyKey, spaceKey.
export class CredentialGenerator {
  constructor (
    private readonly _keyring: Keyring,
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
        subject: partyKey,
        issuer: partyKey,
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
