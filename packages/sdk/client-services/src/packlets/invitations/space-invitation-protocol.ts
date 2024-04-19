//
// Copyright 2023 DXOS.org
//

import {
  createAdmissionCredentials,
  createDelegatedSpaceInvitationCredential,
  getCredentialAssertion,
} from '@dxos/credentials';
import { writeMessages } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { AlreadyJoinedError } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
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

  getInvitationContext(): Partial<Invitation> & Pick<Invitation, 'kind'> {
    return {
      kind: Invitation.Kind.SPACE,
      spaceKey: this._spaceKey,
    };
  }

  async admit(request: AdmissionRequest, guestProfile?: ProfileDocument | undefined): Promise<AdmissionResponse> {
    invariant(this._spaceKey);
    const space = await this._spaceManager.spaces.get(this._spaceKey);
    invariant(space);

    invariant(request.space);
    const { identityKey, deviceKey } = request.space;

    log('writing guest credentials', { host: this._signingContext.deviceKey, guest: deviceKey });
    // TODO(burdon): Check if already admitted.
    const credentials: FeedMessage.Payload[] = await createAdmissionCredentials(
      this._signingContext.credentialSigner,
      identityKey,
      space.key,
      space.inner.genesisFeedKey,
      guestProfile,
    );

    // TODO(dmaretskyi): Refactor.
    invariant(credentials[0].credential);
    const spaceMemberCredential = credentials[0].credential.credential;
    invariant(getCredentialAssertion(spaceMemberCredential)['@type'] === 'dxos.halo.credentials.SpaceMember');

    await writeMessages(space.inner.controlPipeline.writer, credentials);

    return {
      space: {
        credential: spaceMemberCredential,
        controlTimeframe: space.inner.controlPipeline.state.timeframe,
      },
    };
  }

  async delegate(invitation: Invitation): Promise<void> {
    invariant(this._spaceKey);
    const space = await this._spaceManager.spaces.get(this._spaceKey);
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
        role: SpaceMember.Role.ADMIN,
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

    await writeMessages(space.inner.controlPipeline.writer, [credential]);
  }

  checkInvitation(invitation: Partial<Invitation>) {
    if (invitation.spaceKey && this._spaceManager.spaces.has(invitation.spaceKey)) {
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
