//
// Copyright 2023 DXOS.org
//

import { type Context } from '@dxos/context';
import {
  createCancelDelegatedSpaceInvitationCredential,
  createDelegatedSpaceInvitationCredential,
  getCredentialAssertion,
} from '@dxos/credentials';
import { writeMessages } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type KeyringApi } from '@dxos/keyring';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { AlreadyJoinedError, AuthorizationError, InvalidInvitationError, SpaceNotFoundError } from '@dxos/protocols';
import { fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import { Invitation, Invitation_AuthMethod, Invitation_Kind, Invitation_Type } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { type ProfileDocument, SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import {
  type AdmissionRequest,
  type AdmissionResponse,
  type IntroductionRequest,
} from '@dxos/protocols/proto/dxos/halo/invitations';

import { type DataSpaceManager, type SigningContext } from '../spaces';
import { type InvitationProtocol } from './invitation-protocol';
import { computeExpirationTime, fromBufAuthMethod, toSpaceMemberRole } from './utils';

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
    invariant(this._spaceKey && request.space);
    log('writing guest credentials', { host: this._signingContext.deviceKey, guest: request.space.deviceKey });

    const spaceMemberCredential = await this._spaceManager.admitMember({
      spaceKey: this._spaceKey,
      identityKey: request.space.identityKey,
      role: toSpaceMemberRole(invitation.role),
      profile: guestProfile,
      delegationCredentialId: toPublicKey(invitation.delegationCredentialId),
    });

    const space = this._spaceManager.spaces.get(this._spaceKey);
    return {
      space: {
        credential: spaceMemberCredential,
        controlTimeframe: space?.inner.controlPipeline.state.timeframe,
      },
    };
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
    const credential = await createDelegatedSpaceInvitationCredential(
      this._signingContext.credentialSigner,
      space.key,
      {
        invitationId: invitation.invitationId,
        authMethod: fromBufAuthMethod(invitation.authMethod),
        swarmKey,
        role: toSpaceMemberRole(invitation.role),
        expiresOn: computeExpirationTime(invitation),
        multiUse: invitation.multiUse ?? false,
        guestKey:
          invitation.authMethod === Invitation_AuthMethod.KNOWN_PUBLIC_KEY
            ? toPublicKey(invitation.guestKeypair?.publicKey)
            : undefined,
      },
    );

    invariant(credential.credential);
    await writeMessages(space.inner.controlPipeline.writer, [credential]);
    return credential.credential.credential.id!;
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

    invariant(credential.credential);
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
    return {
      profile: this._signingContext.getProfile(),
    };
  }

  async createAdmissionRequest(): Promise<AdmissionRequest> {
    // Generate a pair of keys for our feeds.
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();

    return {
      space: {
        identityKey: this._signingContext.identityKey,
        deviceKey: this._signingContext.deviceKey,
        controlFeedKey,
        dataFeedKey,
      },
    };
  }

  async accept(ctx: Context, response: AdmissionResponse): Promise<Partial<Invitation>> {
    invariant(response.space);
    const { credential, controlTimeframe, dataTimeframe } = response.space;
    const assertion = getCredentialAssertion(credential);
    invariant(assertion['@type'] === 'dxos.halo.credentials.SpaceMember', 'Invalid credential');
    invariant(credential.subject.id.equals(this._signingContext.identityKey));

    if (this._spaceManager.spaces.has(assertion.spaceKey)) {
      throw new AlreadyJoinedError({ message: 'Already joined space.' });
    }

    // Create local space.
    await this._spaceManager.acceptSpace(ctx, {
      spaceKey: assertion.spaceKey,
      genesisFeedKey: assertion.genesisFeedKey,
      spaceRootUrl: assertion.spaceRootUrl,
      controlTimeframe,
      dataTimeframe,
      tags: assertion.tags,
    });

    await this._signingContext.recordCredential(credential);

    return { spaceKey: fromPublicKey(assertion.spaceKey) };
  }
}
