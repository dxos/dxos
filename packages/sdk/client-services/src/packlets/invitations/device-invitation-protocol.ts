//
// Copyright 2023 DXOS.org
//

import { getCredentialAssertion, normalizeCredentialForBuf } from '@dxos/credentials';
import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import { type PublicKey } from '@dxos/keys';
import { AlreadyJoinedError } from '@dxos/protocols';
import { bufToTimeframe, encodePublicKey, timeframeToBuf, toPublicKey } from '@dxos/protocols/buf';
import { type Invitation, Invitation_Kind } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import type { DeviceProfileDocument } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import {
  type AdmissionRequest,
  type AdmissionResponse,
  type IntroductionRequest,
} from '@dxos/protocols/buf/dxos/halo/invitations_pb';

import { type Identity, type JoinIdentityProps } from '../identity';

import { type InvitationProtocol } from './invitation-protocol';

export class DeviceInvitationProtocol implements InvitationProtocol {
  constructor(
    private readonly _keyring: Keyring,
    private readonly _getIdentity: () => Identity,
    private readonly _acceptIdentity: (identity: JoinIdentityProps) => Promise<Identity>,
  ) {}

  toJSON(): object {
    return {
      kind: 'device',
    };
  }

  checkCanInviteNewMembers(): Error | undefined {
    return undefined;
  }

  getInvitationContext(): Partial<Invitation> & Pick<Invitation, 'kind'> {
    return {
      kind: Invitation_Kind.DEVICE,
    };
  }

  async delegate(): Promise<PublicKey> {
    throw new Error('delegation not supported');
  }

  async cancelDelegation(): Promise<void> {
    throw new Error('delegation not supported');
  }

  async admit(_: Invitation, request: AdmissionRequest): Promise<AdmissionResponse> {
    const deviceRequest = (request as any).device ?? (request.kind?.case === 'device' ? request.kind.value : undefined);
    invariant(deviceRequest);
    const identity = this._getIdentity();
    const credential = await identity.admitDevice(deviceRequest);
    invariant(getCredentialAssertion(credential)['@type'] === 'dxos.halo.credentials.AuthorizedDevice');

    return {
      kind: {
        case: 'device',
        value: {
          identityKey: encodePublicKey(identity.identityKey),
          haloSpaceKey: encodePublicKey(identity.haloSpaceKey),
          genesisFeedKey: encodePublicKey(identity.haloGenesisFeedKey),
          controlTimeframe: timeframeToBuf(identity.controlPipeline.state.timeframe),
          credential: normalizeCredentialForBuf(credential),
        },
      },
    } as unknown as AdmissionResponse;
  }

  checkInvitation(invitation: Partial<Invitation>): AlreadyJoinedError | undefined {
    try {
      const identity = this._getIdentity();
      if (identity) {
        return new AlreadyJoinedError({ message: 'Currently only one identity per client is supported.' });
      }
    } catch {
      // No identity.
    }
  }

  createIntroduction(): IntroductionRequest {
    return {} as IntroductionRequest;
  }

  async createAdmissionRequest(deviceProfile?: DeviceProfileDocument): Promise<AdmissionRequest> {
    const deviceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();

    return {
      kind: {
        case: 'device',
        value: {
          deviceKey: encodePublicKey(deviceKey),
          controlFeedKey: encodePublicKey(controlFeedKey),
          dataFeedKey: encodePublicKey(dataFeedKey),
          profile: deviceProfile,
        },
      },
    } as AdmissionRequest;
  }

  async accept(response: AdmissionResponse, request: AdmissionRequest): Promise<Partial<Invitation>> {
    const deviceResponse =
      (response as any).device ?? (response.kind?.case === 'device' ? response.kind.value : undefined);
    invariant(deviceResponse);

    const deviceRequest = (request as any).device ?? (request.kind?.case === 'device' ? request.kind.value : undefined);
    invariant(deviceRequest);

    // Convert buf PublicKey messages and TimeframeVector to application types.
    const identityKey = toPublicKey(deviceResponse.identityKey);
    const haloSpaceKey = toPublicKey(deviceResponse.haloSpaceKey);
    const genesisFeedKey = toPublicKey(deviceResponse.genesisFeedKey);
    const deviceKey = toPublicKey(deviceRequest.deviceKey);
    const controlFeedKey = toPublicKey(deviceRequest.controlFeedKey);
    const dataFeedKey = toPublicKey(deviceRequest.dataFeedKey);
    const controlTimeframe = deviceResponse.controlTimeframe
      ? bufToTimeframe(deviceResponse.controlTimeframe)
      : undefined;

    await this._acceptIdentity({
      identityKey,
      deviceKey,
      haloSpaceKey,
      haloGenesisFeedKey: genesisFeedKey,
      controlFeedKey,
      dataFeedKey,
      controlTimeframe,
      deviceProfile: deviceRequest.profile,
      authorizedDeviceCredential: deviceResponse.credential,
    });

    return { identityKey: encodePublicKey(identityKey) };
  }
}
