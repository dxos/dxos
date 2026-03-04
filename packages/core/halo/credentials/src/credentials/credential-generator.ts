//
// Copyright 2022 DXOS.org
//

import { type Signer } from '@dxos/crypto';
import { type PublicKey } from '@dxos/keys';
import { create, TimeframeVectorProto } from '@dxos/protocols/buf';
import {
  AdmittedFeed_Designation,
  AdmittedFeedSchema,
  AuthorizedDeviceSchema,
  type Credential,
  DeviceProfileSchema,
  EpochSchema,
  IdentityProfileSchema,
  SpaceGenesisSchema,
  SpaceMember_Role,
  SpaceMemberSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type DeviceProfileDocument, type ProfileDocument } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import {
  CancelDelegatedInvitationSchema,
  type DelegateSpaceInvitation,
  DelegateSpaceInvitationSchema,
} from '@dxos/protocols/buf/dxos/halo/invitations_pb';
import { Timeframe } from '@dxos/timeframe';

import { type CredentialSigner, createCredential, toBufPublicKey } from './credential-factory';

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
        assertion: create(SpaceGenesisSchema, {
          spaceKey: toBufPublicKey(spaceKey),
        }),
      }),

      await createCredential({
        signer: this._signer,
        issuer: spaceKey,
        subject: this._identityKey,
        assertion: create(SpaceMemberSchema, {
          spaceKey: toBufPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          profile: creatorProfile,
          genesisFeedKey: toBufPublicKey(controlKey),
        }),
      }),

      await this.createFeedAdmission(spaceKey, controlKey, AdmittedFeed_Designation.CONTROL),
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
        assertion: create(SpaceMemberSchema, {
          spaceKey: toBufPublicKey(spaceKey),
          role: SpaceMember_Role.EDITOR,
          genesisFeedKey: toBufPublicKey(genesisFeedKey),
        }),
      }),

      await this.createFeedAdmission(spaceKey, controlKey, AdmittedFeed_Designation.CONTROL),
      await this.createFeedAdmission(spaceKey, dataKey, AdmittedFeed_Designation.DATA),
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
      assertion: create(AuthorizedDeviceSchema, {
        identityKey: toBufPublicKey(this._identityKey),
        deviceKey: toBufPublicKey(deviceKey),
      }),
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
      assertion: create(DeviceProfileSchema, {
        profile,
      }),
    });
  }

  /**
   * Add feed to space.
   */
  async createFeedAdmission(
    spaceKey: PublicKey,
    feedKey: PublicKey,
    designation: AdmittedFeed_Designation,
  ): Promise<Credential> {
    return createCredential({
      signer: this._signer,
      issuer: this._identityKey,
      subject: feedKey,
      assertion: create(AdmittedFeedSchema, {
        spaceKey: toBufPublicKey(spaceKey),
        identityKey: toBufPublicKey(this._identityKey),
        deviceKey: toBufPublicKey(this._deviceKey),
        designation,
      }),
    });
  }

  async createProfileCredential(profile: ProfileDocument): Promise<Credential> {
    return createCredential({
      signer: this._signer,
      issuer: this._identityKey,
      subject: this._identityKey,
      assertion: create(IdentityProfileSchema, {
        profile,
      }),
    });
  }

  async createEpochCredential(spaceKey: PublicKey): Promise<Credential> {
    return createCredential({
      signer: this._signer,
      issuer: this._identityKey,
      subject: spaceKey,
      assertion: create(EpochSchema, {
        number: 0,
        timeframe: TimeframeVectorProto.encode(new Timeframe()),
      }),
    });
  }
}

// TODO(burdon): Reconcile with above (esp. Signer).
export const createDeviceAuthorization = async (
  signer: CredentialSigner,
  identityKey: PublicKey,
  deviceKey: PublicKey,
): Promise<{ credential: Credential }[]> => {
  const credentials = await Promise.all([
    await signer.createCredential({
      subject: deviceKey,
      assertion: create(AuthorizedDeviceSchema, {
        identityKey: toBufPublicKey(identityKey),
        deviceKey: toBufPublicKey(deviceKey),
      }),
    }),
  ]);

  return credentials.map((credential) => ({
    credential,
  }));
};

// TODO(burdon): Reconcile with above (esp. Signer).
/**
 * @param signer - invitation signer.
 * @param identityKey - identity key of the admitted member.
 * @param spaceKey - subject space key.
 * @param genesisFeedKey - genesis feed key of the space.
 * @param role - role of the newly added member.
 * @param membershipChainHeads - ids of the last known SpaceMember credentials (branching possible).
 * @param profile - profile of the newly added member.
 * @param invitationCredentialId - id of the delegated invitation credential in case one was used to add the member.
 */
export const createAdmissionCredentials = async (
  signer: CredentialSigner,
  identityKey: PublicKey,
  spaceKey: PublicKey,
  genesisFeedKey: PublicKey,
  role: SpaceMember_Role = SpaceMember_Role.ADMIN,
  membershipChainHeads: PublicKey[] = [],
  profile?: ProfileDocument,
  invitationCredentialId?: PublicKey,
): Promise<{ credential?: { credential: Credential } }[]> => {
  const credentials = await Promise.all([
    await signer.createCredential({
      subject: identityKey,
      parentCredentialIds: membershipChainHeads,
      assertion: create(SpaceMemberSchema, {
        spaceKey: toBufPublicKey(spaceKey),
        role,
        profile,
        genesisFeedKey: toBufPublicKey(genesisFeedKey),
        ...(invitationCredentialId ? { invitationCredentialId: toBufPublicKey(invitationCredentialId) } : {}),
      }),
    }),
  ]);

  return credentials.map((credential) => ({
    credential: { credential },
  }));
};

export const createDelegatedSpaceInvitationCredential = async (
  signer: CredentialSigner,
  subject: PublicKey,
  invitation: DelegateSpaceInvitation,
): Promise<{ credential?: { credential: Credential } }> => {
  const credential = await signer.createCredential({
    subject,
    assertion: create(DelegateSpaceInvitationSchema, {
      invitationId: invitation.invitationId,
      authMethod: invitation.authMethod,
      swarmKey: invitation.swarmKey,
      role: invitation.role,
      guestKey: invitation.guestKey,
      expiresOn: invitation.expiresOn,
      multiUse: invitation.multiUse,
    }),
  });
  return { credential: { credential } };
};

/**
 * @param signer - credential issuer.
 * @param subject - key of the space the invitation was for.
 * @param invitationCredentialId id of a dxos.halo.invitations.DelegateSpaceInvitation credential.
 */
export const createCancelDelegatedSpaceInvitationCredential = async (
  signer: CredentialSigner,
  subject: PublicKey,
  invitationCredentialId: PublicKey,
): Promise<{ credential?: { credential: Credential } }> => {
  const credential = await signer.createCredential({
    subject,
    assertion: create(CancelDelegatedInvitationSchema, {
      credentialId: toBufPublicKey(invitationCredentialId),
    }),
  });
  return { credential: { credential } };
};
