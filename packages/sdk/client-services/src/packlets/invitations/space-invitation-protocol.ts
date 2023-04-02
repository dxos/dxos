//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';

import { createAdmissionCredentials, getCredentialAssertion } from '@dxos/credentials';
import { SigningContext } from '@dxos/echo-pipeline';
import { writeMessages } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AdmissionRequest, AdmissionResponse, IntroductionRequest } from '@dxos/protocols/proto/dxos/halo/invitations';

import { DataSpaceManager } from '../spaces';
import { InvitationProtocol } from './invitation-protocol';

export class SpaceInvitationProtocol implements InvitationProtocol {
  constructor(
    private readonly _spaceManager: DataSpaceManager,
    private readonly _signingContext: SigningContext,
    private readonly _keyring: Keyring,
    private readonly _spaceKey?: PublicKey
  ) {}

  toJSON(): object {
    return {
      deviceKey: this._signingContext.deviceKey,
      spaceKey: this._spaceKey
    };
  }

  getInvitationContext(): Partial<Invitation> & Pick<Invitation, 'kind'> {
    return {
      kind: Invitation.Kind.SPACE,
      spaceKey: this._spaceKey
    };
  }

  async admit(request: AdmissionRequest, guestProfile?: ProfileDocument | undefined): Promise<AdmissionResponse> {
    assert(this._spaceKey);
    const space = await this._spaceManager.spaces.get(this._spaceKey);
    assert(space);

    assert(request.space);
    const { identityKey, deviceKey } = request.space;

    log('writing guest credentials', { host: this._signingContext.deviceKey, guest: deviceKey });
    // TODO(burdon): Check if already admitted.
    const credentials: FeedMessage.Payload[] = await createAdmissionCredentials(
      this._signingContext.credentialSigner,
      identityKey,
      space.key,
      space.inner.genesisFeedKey,
      guestProfile
    );

    // TODO(dmaretskyi): Refactor.
    assert(credentials[0].credential);
    const spaceMemberCredential = credentials[0].credential.credential;
    assert(getCredentialAssertion(spaceMemberCredential)['@type'] === 'dxos.halo.credentials.SpaceMember');

    await writeMessages(space.inner.controlPipeline.writer, credentials);

    return {
      space: {
        credential: spaceMemberCredential,
        controlTimeframe: space.inner.controlPipeline.state.timeframe,
        dataTimeframe: space.dataPipeline.pipelineState?.timeframe
      }
    };
  }

  createIntroduction(): IntroductionRequest {
    return {
      profile: this._signingContext.profile
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
        dataFeedKey
      }
    };
  }

  async accept(response: AdmissionResponse): Promise<Partial<Invitation>> {
    assert(response.space);
    const { credential, controlTimeframe, dataTimeframe } = response.space;
    const assertion = getCredentialAssertion(credential);
    assert(assertion['@type'] === 'dxos.halo.credentials.SpaceMember', 'Invalid credential');
    assert(credential.subject.id.equals(this._signingContext.identityKey));

    // Create local space.
    await this._spaceManager.acceptSpace({
      spaceKey: assertion.spaceKey,
      genesisFeedKey: assertion.genesisFeedKey,
      controlTimeframe,
      dataTimeframe
    });

    await this._signingContext.recordCredential(credential);

    return { spaceKey: assertion.spaceKey };
  }
}
