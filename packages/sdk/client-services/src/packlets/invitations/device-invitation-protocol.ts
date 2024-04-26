//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import { type PublicKey } from '@dxos/keys';
import { AlreadyJoinedError } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import type { DeviceProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import {
  type AdmissionRequest,
  type AdmissionResponse,
  type IntroductionRequest,
} from '@dxos/protocols/proto/dxos/halo/invitations';

import { type InvitationProtocol } from './invitation-protocol';
import { type Identity, type JoinIdentityParams } from '../identity';

export class DeviceInvitationProtocol implements InvitationProtocol {
  constructor(
    private readonly _keyring: Keyring,
    private readonly _getIdentity: () => Identity,
    private readonly _acceptIdentity: (identity: JoinIdentityParams) => Promise<Identity>,
  ) {}

  toJSON(): object {
    return {};
  }

  getInvitationContext(): Partial<Invitation> & Pick<Invitation, 'kind'> {
    return {
      kind: Invitation.Kind.DEVICE,
    };
  }

  async delegate(invitation: Invitation): Promise<PublicKey> {
    throw new Error('delegation not supported');
  }

  async admit(_: Invitation, request: AdmissionRequest): Promise<AdmissionResponse> {
    invariant(request.device);
    const identity = this._getIdentity();
    await identity.admitDevice(request.device);

    return {
      device: {
        identityKey: identity.identityKey,
        haloSpaceKey: identity.haloSpaceKey,
        genesisFeedKey: identity.haloGenesisFeedKey,
        controlTimeframe: identity.controlPipeline.state.timeframe,
      },
    };
  }

  checkInvitation(invitation: Partial<Invitation>) {
    try {
      const identity = this._getIdentity();
      if (identity) {
        return new AlreadyJoinedError('Currently only one identity per client is supported.');
      }
    } catch {
      // No identity.
    }
  }

  createIntroduction(): IntroductionRequest {
    return {};
  }

  async createAdmissionRequest(deviceProfile?: DeviceProfileDocument): Promise<AdmissionRequest> {
    const deviceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();

    return {
      device: {
        deviceKey,
        controlFeedKey,
        dataFeedKey,
        profile: deviceProfile,
      },
    };
  }

  async accept(response: AdmissionResponse, request: AdmissionRequest): Promise<Partial<Invitation>> {
    invariant(response.device);
    const { identityKey, haloSpaceKey, genesisFeedKey, controlTimeframe } = response.device;

    invariant(request.device);
    const { deviceKey, controlFeedKey, dataFeedKey, profile } = request.device;

    // TODO(wittjosiah): When multiple identities are supported, verify identity doesn't already exist before accepting.

    await this._acceptIdentity({
      identityKey,
      deviceKey,
      haloSpaceKey,
      haloGenesisFeedKey: genesisFeedKey,
      controlFeedKey,
      dataFeedKey,
      controlTimeframe,
      deviceProfile: profile,
    });

    return { identityKey };
  }
}
