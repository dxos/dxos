//
// Copyright 2023 DXOS.org
//

import {
  createCancelDelegatedSpaceInvitationCredential,
  createDelegatedSpaceInvitationCredential,
  getCredentialAssertion,
  normalizeCredentialForBuf,
} from '@dxos/credentials';
import { writeMessages } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { AlreadyJoinedError, AuthorizationError, InvalidInvitationError, SpaceNotFoundError } from '@dxos/protocols';
import { TimeframeVectorProto.decode, encodePublicKey, TimeframeVectorProto.encode, toPublicKey } from '@dxos/protocols/buf';
import {
  type Invitation,
  Invitation_AuthMethod,
  Invitation_Kind,
  Invitation_Type,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { type Credential, type ProfileDocument, SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import {
  type AdmissionRequest,
  type AdmissionResponse,
  type IntroductionRequest,
} from '@dxos/protocols/buf/dxos/halo/invitations_pb';

import { type DataSpaceManager, type SigningContext } from '../spaces';

import { type InvitationProtocol } from './invitation-protocol';
import { computeExpirationTime } from './utils';

export class SpaceInvitationProtocol implements InvitationProtocol {
  constructor(
    private readonly _spaceManager: DataSpaceManager,
    private readonly _signingContext: SigningContext,
    private readonly _keyring: Keyring,
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
      spaceKey: encodePublicKey(this._spaceKey),
      spaceId: space.id,
    };
  }

  async admit(
    invitation: Invitation,
    request: AdmissionRequest,
    guestProfile?: ProfileDocument | undefined,
  ): Promise<AdmissionResponse> {
    const spaceRequest = (request as any).space ?? (request.kind?.case === 'space' ? request.kind.value : undefined);
    invariant(this._spaceKey && spaceRequest);
    log('writing guest credentials', { host: this._signingContext.deviceKey, guest: spaceRequest.deviceKey });

    const spaceMemberCredential = await this._spaceManager.admitMember({
      spaceKey: this._spaceKey,
      identityKey: toPublicKey(spaceRequest.identityKey),
      role: invitation.role ?? SpaceMember_Role.ADMIN,
      profile: guestProfile,
      delegationCredentialId: invitation.delegationCredentialId
        ? toPublicKey(invitation.delegationCredentialId)
        : undefined,
    });

    const space = this._spaceManager.spaces.get(this._spaceKey);
    return {
      kind: {
        case: 'space',
        value: {
          credential: normalizeCredentialForBuf(spaceMemberCredential),
          controlTimeframe: space ? TimeframeVectorProto.encode(space.inner.controlPipeline.state.timeframe) : undefined,
        },
      },
    } as AdmissionResponse;
  }

  async delegate(invitation: Invitation): Promise<PublicKey> {
    invariant(this._spaceKey);
    const space = this._spaceManager.spaces.get(this._spaceKey);
    invariant(space);
    if (invitation.authMethod === Invitation_AuthMethod.KNOWN_PUBLIC_KEY) {
      invariant(invitation.guestKeypair?.publicKey);
    }

    log('writing delegate space invitation', { host: this._signingContext.deviceKey, id: invitation.invitationId });
    const credential = await createDelegatedSpaceInvitationCredential(
      this._signingContext.credentialSigner,
      space.key,
      {
        invitationId: invitation.invitationId,
        authMethod: invitation.authMethod,
        swarmKey: invitation.swarmKey,
        role: invitation.role ?? SpaceMember_Role.ADMIN,
        expiresOn: computeExpirationTime(invitation),
        multiUse: invitation.multiUse ?? false,
        guestKey:
          invitation.authMethod === Invitation_AuthMethod.KNOWN_PUBLIC_KEY
            ? invitation.guestKeypair!.publicKey
            : undefined,
      } as any,
    );

    invariant(credential.credential);
    await writeMessages(space.inner.controlPipeline.writer, [credential]);
    return toPublicKey(credential.credential.credential.id!);
  }

  async cancelDelegation(invitation: Invitation): Promise<void> {
    invariant(this._spaceKey);
    invariant(invitation.type === Invitation_Type.DELEGATED && invitation.delegationCredentialId);
    const space = this._spaceManager.spaces.get(this._spaceKey);
    invariant(space);

    log('cancelling delegated space invitation', { host: this._signingContext.deviceKey, id: invitation.invitationId });
    const credential = await createCancelDelegatedSpaceInvitationCredential(
      this._signingContext.credentialSigner,
      space.key,
      toPublicKey(invitation.delegationCredentialId!),
    );

    invariant(credential.credential);
    await writeMessages(space.inner.controlPipeline.writer, [credential]);
  }

  checkInvitation(invitation: Partial<Invitation>): InvalidInvitationError | AlreadyJoinedError | undefined {
    if (invitation.spaceKey == null) {
      return new InvalidInvitationError({ message: 'No spaceKey was provided for a space invitation.' });
    }
    if (this._spaceManager.spaces.has(toPublicKey(invitation.spaceKey!))) {
      return new AlreadyJoinedError({ message: 'Already joined space.' });
    }
  }

  createIntroduction(): IntroductionRequest {
    return {
      profile: this._signingContext.getProfile(),
    } as IntroductionRequest;
  }

  async createAdmissionRequest(): Promise<AdmissionRequest> {
    // Generate a pair of keys for our feeds.
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();

    return {
      kind: {
        case: 'space',
        value: {
          identityKey: encodePublicKey(this._signingContext.identityKey),
          deviceKey: encodePublicKey(this._signingContext.deviceKey),
          controlFeedKey: encodePublicKey(controlFeedKey),
          dataFeedKey: encodePublicKey(dataFeedKey),
        },
      },
    } as AdmissionRequest;
  }

  async accept(response: AdmissionResponse): Promise<Partial<Invitation>> {
    const spaceResponse =
      (response as any).space ?? (response.kind?.case === 'space' ? response.kind.value : undefined);
    invariant(spaceResponse);
    const { credential } = spaceResponse;
    const assertion = getCredentialAssertion(credential as unknown as Credential);
    invariant(assertion.$typeName === 'dxos.halo.credentials.SpaceMember', 'Invalid credential');
    invariant(toPublicKey(credential.subject.id).equals(this._signingContext.identityKey));

    const spaceKey = assertion.spaceKey ? toPublicKey(assertion.spaceKey) : undefined;
    if (spaceKey && this._spaceManager.spaces.has(spaceKey)) {
      throw new AlreadyJoinedError({ message: 'Already joined space.' });
    }

    // Convert buf TimeframeVector to Timeframe.
    const controlTimeframe = spaceResponse.controlTimeframe
      ? TimeframeVectorProto.decode(spaceResponse.controlTimeframe)
      : undefined;
    const dataTimeframe = spaceResponse.dataTimeframe ? TimeframeVectorProto.decode(spaceResponse.dataTimeframe) : undefined;

    await this._spaceManager.acceptSpace({
      spaceKey: spaceKey!,
      genesisFeedKey: assertion.genesisFeedKey ? toPublicKey(assertion.genesisFeedKey) : undefined!,
      controlTimeframe,
      dataTimeframe,
    });

    await this._signingContext.recordCredential(credential);

    return { spaceKey: spaceKey ? encodePublicKey(spaceKey) : undefined! };
  }
}
