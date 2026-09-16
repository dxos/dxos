//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { type Context } from '@dxos/context';
import {
  createCancelDelegatedSpaceInvitationCredential,
  createDelegatedSpaceInvitationCredential,
  credentialIdOf,
  credentialOfPayload,
  getCredentialAssertion,
} from '@dxos/credentials';
import { writeMessages } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type KeyringApi } from '@dxos/keyring';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { AlreadyJoinedError, AuthorizationError, InvalidInvitationError, SpaceNotFoundError } from '@dxos/protocols';
import {
  fromDate,
  fromPublicKey,
  fromTimeframe,
  requirePublicKey,
  toPublicKey,
  toTimeframe,
} from '@dxos/protocols/buf';
import {
  Invitation,
  Invitation_AuthMethod,
  Invitation_Kind,
  Invitation_Type,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { type ProfileDocument } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { DelegateSpaceInvitationSchema } from '@dxos/protocols/buf/dxos/halo/invitations_pb';
import {
  type AdmissionRequest,
  AdmissionRequestSchema,
  type AdmissionResponse,
  AdmissionResponseSchema,
  type IntroductionRequest,
  IntroductionRequestSchema,
  SpaceAdmissionCredentialsSchema,
  SpaceAdmissionRequestSchema,
} from '@dxos/protocols/buf/dxos/halo/invitations_pb';

import { type DataSpaceManager, type SigningContext } from '../spaces/index.ts';
import { type InvitationProtocol } from './invitation-protocol.ts';
import { computeExpirationTime, toSpaceMemberRole } from './utils.ts';

export class SpaceInvitationProtocol implements InvitationProtocol {
  constructor(
    private readonly _spaceManager: DataSpaceManager,
    private readonly _signingContext: SigningContext,
    private readonly _keyring: KeyringApi,
    private readonly _spaceKey?: PublicKey,
  ) {}

  toJSON(): object {
    return {
      kind: 'space',
      deviceKey: this._signingContext.deviceKey,
      spaceKey: this._spaceKey,
    };
  }

  checkCanInviteNewMembers(): Error | undefined {
    if (this._spaceKey == null) {
      return new InvalidInvitationError({ message: 'No spaceKey was provided for a space invitation.' });
    }
    const space = this._spaceManager.spaces.get(this._spaceKey);
    if (space == null) {
      return new SpaceNotFoundError(this._spaceKey);
    }
    if (!space?.inner.spaceState.hasMembershipManagementPermission(this._signingContext.identityKey)) {
      return new AuthorizationError({ message: 'No member management permission.' });
    }
    return undefined;
  }

  getInvitationContext(): Partial<Invitation> & Pick<Invitation, 'kind'> {
    invariant(this._spaceKey);
    const space = this._spaceManager.spaces.get(this._spaceKey);
    invariant(space);
    return {
      kind: Invitation_Kind.SPACE,
      spaceKey: fromPublicKey(this._spaceKey),
      spaceId: space.id,
    };
  }

  async admit(
    invitation: Invitation,
    request: AdmissionRequest,
    guestProfile?: ProfileDocument | undefined,
  ): Promise<AdmissionResponse> {
    invariant(this._spaceKey && request.kind.case === 'space');
    const spaceRequest = request.kind.value;
    log('writing guest credentials', { host: this._signingContext.deviceKey, guest: spaceRequest.deviceKey });

    const spaceMemberCredential = await this._spaceManager.admitMember({
      spaceKey: this._spaceKey,
      identityKey: requirePublicKey(spaceRequest.identityKey),
      role: toSpaceMemberRole(invitation.role),
      profile: guestProfile,
      delegationCredentialId: toPublicKey(invitation.delegationCredentialId),
    });

    const space = this._spaceManager.spaces.get(this._spaceKey);
    const controlTimeframe = space?.inner.controlPipeline.state.timeframe;
    return create(AdmissionResponseSchema, {
      kind: {
        case: 'space',
        value: create(SpaceAdmissionCredentialsSchema, {
          credential: spaceMemberCredential,
          controlTimeframe: controlTimeframe && fromTimeframe(controlTimeframe),
        }),
      },
    });
  }

  async delegate(invitation: Invitation): Promise<PublicKey> {
    invariant(this._spaceKey);
    const space = this._spaceManager.spaces.get(this._spaceKey);
    invariant(space);
    if (invitation.authMethod === Invitation_AuthMethod.KNOWN_PUBLIC_KEY) {
      invariant(invitation.guestKeypair?.publicKey);
    }

    log('writing delegate space invitation', { host: this._signingContext.deviceKey, id: invitation.invitationId });
    const swarmKey = toPublicKey(invitation.swarmKey);
    invariant(swarmKey, 'swarmKey missing in the invitation');
    const expiresOn = computeExpirationTime(invitation);
    const credential = await createDelegatedSpaceInvitationCredential(
      this._signingContext.credentialSigner,
      space.key,
      create(DelegateSpaceInvitationSchema, {
        invitationId: invitation.invitationId,
        authMethod: invitation.authMethod,
        swarmKey: fromPublicKey(swarmKey),
        role: toSpaceMemberRole(invitation.role),
        expiresOn: expiresOn && fromDate(expiresOn),
        multiUse: invitation.multiUse ?? false,
        guestKey:
          invitation.authMethod === Invitation_AuthMethod.KNOWN_PUBLIC_KEY
            ? invitation.guestKeypair?.publicKey
            : undefined,
      }),
    );

    await writeMessages(space.inner.controlPipeline.writer, [credential]);
    return credentialIdOf(credentialOfPayload(credential));
  }

  async cancelDelegation(invitation: Invitation): Promise<void> {
    invariant(this._spaceKey);
    invariant(invitation.type === Invitation_Type.DELEGATED && invitation.delegationCredentialId);
    const delegationCredentialId = toPublicKey(invitation.delegationCredentialId);
    invariant(delegationCredentialId);
    const space = this._spaceManager.spaces.get(this._spaceKey);
    invariant(space);

    log('cancelling delegated space invitation', { host: this._signingContext.deviceKey, id: invitation.invitationId });
    const credential = await createCancelDelegatedSpaceInvitationCredential(
      this._signingContext.credentialSigner,
      space.key,
      delegationCredentialId,
    );

    await writeMessages(space.inner.controlPipeline.writer, [credential]);
  }

  checkInvitation(invitation: Partial<Invitation>): InvalidInvitationError | AlreadyJoinedError | undefined {
    if (invitation.spaceKey == null) {
      return new InvalidInvitationError({ message: 'No spaceKey was provided for a space invitation.' });
    }
    const spaceKey = toPublicKey(invitation.spaceKey);
    if (spaceKey && this._spaceManager.spaces.has(spaceKey)) {
      return new AlreadyJoinedError({ message: 'Already joined space.' });
    }
  }

  createIntroduction(): IntroductionRequest {
    return create(IntroductionRequestSchema, { profile: this._signingContext.getProfile() });
  }

  async createAdmissionRequest(): Promise<AdmissionRequest> {
    // Generate a pair of keys for our feeds.
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();

    return create(AdmissionRequestSchema, {
      kind: {
        case: 'space',
        value: create(SpaceAdmissionRequestSchema, {
          identityKey: fromPublicKey(this._signingContext.identityKey),
          deviceKey: fromPublicKey(this._signingContext.deviceKey),
          controlFeedKey: fromPublicKey(controlFeedKey),
          dataFeedKey: fromPublicKey(dataFeedKey),
        }),
      },
    });
  }

  async accept(ctx: Context, response: AdmissionResponse): Promise<Partial<Invitation>> {
    invariant(response.kind.case === 'space');
    const { credential, controlTimeframe, dataTimeframe } = response.kind.value;
    invariant(credential, 'Admission carries no credential.');
    const assertion = getCredentialAssertion(credential);
    invariant(assertion.$typeName === 'dxos.halo.credentials.SpaceMember', 'Invalid credential');
    invariant(requirePublicKey(credential.subject?.id).equals(this._signingContext.identityKey));

    const spaceKey = requirePublicKey(assertion.spaceKey);
    if (this._spaceManager.spaces.has(spaceKey)) {
      throw new AlreadyJoinedError({ message: 'Already joined space.' });
    }

    // Create local space.
    await this._spaceManager.acceptSpace(ctx, {
      spaceKey,
      genesisFeedKey: requirePublicKey(assertion.genesisFeedKey),
      spaceRootUrl: assertion.spaceRootUrl,
      controlTimeframe: controlTimeframe && toTimeframe(controlTimeframe),
      dataTimeframe: dataTimeframe && toTimeframe(dataTimeframe),
      tags: assertion.tags,
    });

    await this._signingContext.recordCredential(credential);

    return { spaceKey: fromPublicKey(spaceKey) };
  }
}
