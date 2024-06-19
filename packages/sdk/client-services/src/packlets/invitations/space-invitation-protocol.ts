//
// Copyright 2023 DXOS.org
//

import {
  createCancelDelegatedSpaceInvitationCredential,
  createDelegatedSpaceInvitationCredential,
  getCredentialAssertion,
} from '@dxos/credentials';
import { writeMessages } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  AlreadyJoinedError,
  type ApiError,
  AuthorizationError,
  InvalidInvitationError,
  SpaceNotFoundError,
} from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { SpaceMember, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import {
  type AdmissionRequest,
  type AdmissionResponse,
  type IntroductionRequest,
} from '@dxos/protocols/proto/dxos/halo/invitations';

import { type InvitationProtocol } from './invitation-protocol';
import { type DataSpaceManager, type SigningContext } from '../spaces';

export class SpaceInvitationProtocol implements InvitationProtocol {
  constructor(
    private readonly _spaceManager: DataSpaceManager,
    private readonly _signingContext: SigningContext,
    private readonly _keyring: Keyring,
    private readonly _spaceKey?: PublicKey,
  ) {}

  toJSON(): object {
    return {
      deviceKey: this._signingContext.deviceKey,
      spaceKey: this._spaceKey,
    };
  }

  checkCanInviteNewMembers(): ApiError | undefined {
    if (this._spaceKey == null) {
      return new InvalidInvitationError('No spaceKey was provided for a space invitation.');
    }
    const space = this._spaceManager.spaces.get(this._spaceKey);
    if (space == null) {
      return new SpaceNotFoundError(this._spaceKey);
    }
    if (!space?.inner.spaceState.hasMembershipManagementPermission(this._signingContext.identityKey)) {
      return new AuthorizationError('No member management permission.');
    }
    return undefined;
  }

  getInvitationContext(): Partial<Invitation> & Pick<Invitation, 'kind'> {
    return {
      kind: Invitation.Kind.SPACE,
      spaceKey: this._spaceKey,
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
      role: invitation.role ?? SpaceMember.Role.ADMIN,
      profile: guestProfile,
      delegationCredentialId: invitation.delegationCredentialId,
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
    if (invitation.authMethod === Invitation.AuthMethod.KNOWN_PUBLIC_KEY) {
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
        role: invitation.role ?? SpaceMember.Role.ADMIN,
        expiresOn: invitation.lifetime
          ? new Date((invitation.created?.getTime() ?? Date.now()) + invitation.lifetime)
          : undefined,
        multiUse: invitation.multiUse ?? false,
        guestKey:
          invitation.authMethod === Invitation.AuthMethod.KNOWN_PUBLIC_KEY
            ? invitation.guestKeypair!.publicKey
            : undefined,
      },
    );

    invariant(credential.credential);
    await writeMessages(space.inner.controlPipeline.writer, [credential]);
    return credential.credential.credential.id!;
  }

  async cancelDelegation(invitation: Invitation): Promise<void> {
    invariant(this._spaceKey);
    invariant(invitation.type === Invitation.Type.DELEGATED && invitation.delegationCredentialId);
    const space = this._spaceManager.spaces.get(this._spaceKey);
    invariant(space);

    log('cancelling delegated space invitation', { host: this._signingContext.deviceKey, id: invitation.invitationId });
    const credential = await createCancelDelegatedSpaceInvitationCredential(
      this._signingContext.credentialSigner,
      space.key,
      invitation.delegationCredentialId,
    );

    invariant(credential.credential);
    await writeMessages(space.inner.controlPipeline.writer, [credential]);
  }

  checkInvitation(invitation: Partial<Invitation>) {
    if (invitation.spaceKey == null) {
      return new InvalidInvitationError('No spaceKey was provided for a space invitation.');
    }
    if (this._spaceManager.spaces.has(invitation.spaceKey)) {
      return new AlreadyJoinedError('Already joined space.');
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

  async accept(response: AdmissionResponse): Promise<Partial<Invitation>> {
    invariant(response.space);
    const { credential, controlTimeframe, dataTimeframe } = response.space;
    const assertion = getCredentialAssertion(credential);
    invariant(assertion['@type'] === 'dxos.halo.credentials.SpaceMember', 'Invalid credential');
    invariant(credential.subject.id.equals(this._signingContext.identityKey));

    if (this._spaceManager.spaces.has(assertion.spaceKey)) {
      throw new AlreadyJoinedError('Already joined space.');
    }

    // Create local space.
    await this._spaceManager.acceptSpace({
      spaceKey: assertion.spaceKey,
      genesisFeedKey: assertion.genesisFeedKey,
      controlTimeframe,
      dataTimeframe,
    });

    await this._signingContext.recordCredential(credential);

    return { spaceKey: assertion.spaceKey };
  }
}
