//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { type Context } from '@dxos/context';
import { getCredentialAssertion } from '@dxos/credentials';
import { invariant } from '@dxos/invariant';
import { type KeyringApi } from '@dxos/keyring';
import { type PublicKey } from '@dxos/keys';
import { AlreadyJoinedError } from '@dxos/protocols';
import { fromPublicKey, fromTimeframe, requirePublicKey, toTimeframe } from '@dxos/protocols/buf';
import { Invitation, Invitation_Kind } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import type { DeviceProfileDocument } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import {
  type AdmissionRequest,
  AdmissionRequestSchema,
  type AdmissionResponse,
  AdmissionResponseSchema,
  DeviceAdmissionCredentialsSchema,
  DeviceAdmissionRequestSchema,
  type IntroductionRequest,
  IntroductionRequestSchema,
} from '@dxos/protocols/buf/dxos/halo/invitations_pb';

import { type Identity, type JoinIdentityProps } from '../identity';
import { type InvitationProtocol } from './invitation-protocol';

export class DeviceInvitationProtocol implements InvitationProtocol {
  constructor(
    private readonly _keyring: KeyringApi,
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
    invariant(request.kind.case === 'device');
    const identity = this._getIdentity();
    const credential = await identity.admitDevice(request.kind.value);
    invariant(
      getCredentialAssertion(credential).$typeName === 'dxos.halo.credentials.AuthorizedDevice',
      'Invalid credential',
    );

    return create(AdmissionResponseSchema, {
      kind: {
        case: 'device',
        value: create(DeviceAdmissionCredentialsSchema, {
          identityKey: fromPublicKey(identity.identityKey),
          haloSpaceKey: fromPublicKey(identity.haloSpaceKey),
          genesisFeedKey: fromPublicKey(identity.haloGenesisFeedKey),
          controlTimeframe: fromTimeframe(identity.controlPipeline.state.timeframe),
          credential,
          // Absent while the host has not anchored its halo space yet; the joiner then has only the feed.
          haloSpaceRootUrl: identity.haloSpaceRootUrl,
        }),
      },
    });
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
    return create(IntroductionRequestSchema, {});
  }

  async createAdmissionRequest(deviceProfile?: DeviceProfileDocument): Promise<AdmissionRequest> {
    const deviceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();

    return create(AdmissionRequestSchema, {
      kind: {
        case: 'device',
        value: create(DeviceAdmissionRequestSchema, {
          deviceKey: fromPublicKey(deviceKey),
          controlFeedKey: fromPublicKey(controlFeedKey),
          dataFeedKey: fromPublicKey(dataFeedKey),
          profile: deviceProfile,
        }),
      },
    });
  }

  async accept(_ctx: Context, response: AdmissionResponse, request: AdmissionRequest): Promise<Partial<Invitation>> {
    invariant(response.kind.case === 'device');
    const { identityKey, haloSpaceKey, genesisFeedKey, controlTimeframe, haloSpaceRootUrl, credential } =
      response.kind.value;

    invariant(request.kind.case === 'device');
    const { deviceKey, controlFeedKey, dataFeedKey, profile } = request.kind.value;

    // TODO(wittjosiah): When multiple identities are supported, verify identity doesn't already exist before accepting.
    // ctx is unused here because _acceptIdentity uses ServiceContext's lifecycle ctx internally.

    invariant(credential, 'Admission carries no credential.');
    const identityKeyValue = requirePublicKey(identityKey);
    await this._acceptIdentity({
      identityKey: identityKeyValue,
      deviceKey: requirePublicKey(deviceKey),
      haloSpaceKey: requirePublicKey(haloSpaceKey),
      haloGenesisFeedKey: requirePublicKey(genesisFeedKey),
      controlFeedKey: requirePublicKey(controlFeedKey),
      dataFeedKey: requirePublicKey(dataFeedKey),
      controlTimeframe: controlTimeframe && toTimeframe(controlTimeframe),
      deviceProfile: profile,
      authorizedDeviceCredential: credential,
      haloSpaceRootUrl,
    });

    return { identityKey: fromPublicKey(identityKeyValue) };
  }
}
