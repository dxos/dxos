//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
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

  async admit(request: AdmissionRequest): Promise<AdmissionResponse> {
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

  createIntroduction(): IntroductionRequest {
    return {};
  }

  async createAdmissionRequest(): Promise<AdmissionRequest> {
    const deviceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();

    return {
      device: {
        deviceKey,
        controlFeedKey,
        dataFeedKey,
      },
    };
  }

  async accept(response: AdmissionResponse, request: AdmissionRequest): Promise<Partial<Invitation>> {
    invariant(response.device);
    const { identityKey, haloSpaceKey, genesisFeedKey, controlTimeframe } = response.device;

    invariant(request.device);
    const { deviceKey, controlFeedKey, dataFeedKey } = request.device;

    await this._acceptIdentity({
      identityKey,
      deviceKey,
      haloSpaceKey,
      haloGenesisFeedKey: genesisFeedKey,
      controlFeedKey,
      dataFeedKey,
      controlTimeframe,
    });

    return { identityKey };
  }
}
