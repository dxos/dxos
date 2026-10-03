//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { type Signer } from '@dxos/crypto';
import { type PublicKey } from '@dxos/keys';
import { fromPublicKey, fromTimeframe } from '@dxos/protocols/buf';
import { type FeedMessage_Payload } from '@dxos/protocols/buf/dxos/echo/feed_pb';
import {
  AdmittedFeed_Designation,
  AdmittedFeedSchema,
  AuthorizedDeviceSchema,
  type Credential,
  type DeviceProfileDocument,
  DeviceProfileSchema,
  EpochSchema,
  IdentityProfileSchema,
  MembershipPolicy,
  type ProfileDocument,
  SpaceGenesisSchema,
  SpaceMember_Role,
  SpaceMemberSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import {
  CancelDelegatedInvitationSchema,
  type DelegateSpaceInvitation,
  DelegateSpaceInvitationSchema,
} from '@dxos/protocols/buf/dxos/halo/invitations_pb';
import { Timeframe } from '@dxos/timeframe';

import { type CredentialSigner, createCredential } from './credential-factory.ts';
import { credentialPayload } from './feed-payload.ts';

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
    membershipPolicy: MembershipPolicy = MembershipPolicy.INVITE,
  ): Promise<Credential[]> {
    return [
      await createCredential({
        signer: this._signer,
        issuer: spaceKey,
        subject: spaceKey,
        assertion: create(SpaceGenesisSchema, {
          spaceKey: fromPublicKey(spaceKey),
          membershipPolicy,
        }),
      }),

      await createCredential({
        signer: this._signer,
        issuer: spaceKey,
        subject: this._identityKey,
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          profile: creatorProfile,
          genesisFeedKey: fromPublicKey(controlKey),
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
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.EDITOR,
          genesisFeedKey: fromPublicKey(genesisFeedKey),
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
        identityKey: fromPublicKey(this._identityKey),
        deviceKey: fromPublicKey(deviceKey),
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
      assertion: create(DeviceProfileSchema, { profile }),
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
        spaceKey: fromPublicKey(spaceKey),
        identityKey: fromPublicKey(this._identityKey),
        deviceKey: fromPublicKey(this._deviceKey),
        designation,
      }),
    });
  }

  async createProfileCredential(profile: ProfileDocument): Promise<Credential> {
    return createCredential({
      signer: this._signer,
      issuer: this._identityKey,
      subject: this._identityKey,
      assertion: create(IdentityProfileSchema, { profile }),
    });
  }

  async createEpochCredential(spaceKey: PublicKey): Promise<Credential> {
    return createCredential({
      signer: this._signer,
      issuer: this._identityKey,
      subject: spaceKey,
      assertion: create(EpochSchema, {
        number: 0,
        timeframe: fromTimeframe(new Timeframe()),
      }),
    });
  }
}

// TODO(burdon): Reconcile with above (esp. Signer).
export const createDeviceAuthorization = async (
  signer: CredentialSigner,
  identityKey: PublicKey,
  deviceKey: PublicKey,
): Promise<FeedMessage_Payload[]> => {
  const credentials = await Promise.all([
    await signer.createCredential({
      subject: deviceKey,
      assertion: create(AuthorizedDeviceSchema, {
        identityKey: fromPublicKey(identityKey),
        deviceKey: fromPublicKey(deviceKey),
      }),
    }),
  ]);

  return credentials.map((credential) => credentialPayload(credential));
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
export type CreateAdmissionCredentialsOptions = {
  signer: CredentialSigner;
  identityKey: PublicKey;
  spaceKey: PublicKey;
  genesisFeedKey: PublicKey;
  role?: SpaceMember_Role;
  membershipChainHeads?: PublicKey[];
  profile?: ProfileDocument;
  invitationCredentialId?: PublicKey;
  tags?: string[];
  /** Automerge URL of the space root document, for a space that has one. */
  spaceRootUrl?: string;
};

export const createAdmissionCredentials = async ({
  signer,
  identityKey,
  spaceKey,
  genesisFeedKey,
  role = SpaceMember_Role.ADMIN,
  membershipChainHeads = [],
  profile,
  invitationCredentialId,
  tags,
  spaceRootUrl,
}: CreateAdmissionCredentialsOptions): Promise<FeedMessage_Payload[]> => {
  const credentials = await Promise.all([
    await signer.createCredential({
      subject: identityKey,
      parentCredentialIds: membershipChainHeads,
      assertion: create(SpaceMemberSchema, {
        spaceKey: fromPublicKey(spaceKey),
        role,
        profile,
        genesisFeedKey: fromPublicKey(genesisFeedKey),
        spaceRootUrl,
        invitationCredentialId: invitationCredentialId && fromPublicKey(invitationCredentialId),
        tags: tags ?? [],
      }),
    }),
  ]);

  return credentials.map((credential) => credentialPayload(credential));
};

export const createDelegatedSpaceInvitationCredential = async (
  signer: CredentialSigner,
  subject: PublicKey,
  invitation: DelegateSpaceInvitation,
): Promise<FeedMessage_Payload> => {
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
  return credentialPayload(credential);
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
): Promise<FeedMessage_Payload> => {
  const credential = await signer.createCredential({
    subject,
    assertion: create(CancelDelegatedInvitationSchema, {
      credentialId: fromPublicKey(invitationCredentialId),
    }),
  });
  return credentialPayload(credential);
};
