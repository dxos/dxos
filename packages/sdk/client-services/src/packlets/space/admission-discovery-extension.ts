//
// Copyright 2024 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { type Trigger, scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { ProtocolError } from '@dxos/protocols';
import { requirePublicKey } from '@dxos/protocols/buf';
import { type BufService, getBufService } from '@dxos/protocols/buf-service';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import {
  AdmissionDiscoveryService as AdmissionDiscoveryServiceDesc,
  type GetAdmissionCredentialRequest,
  type GetAdmissionCredentialResponse,
  GetAdmissionCredentialResponseSchema,
} from '@dxos/protocols/buf/dxos/mesh/teleport/admission-discovery_pb';
import { type ExtensionContext, RpcExtension } from '@dxos/teleport';

type AdmissionDiscoveryService = BufService<typeof AdmissionDiscoveryServiceDesc>;

import { type Space } from './space';

/**
 * Guest's side for a connection to a concrete peer in p2p network during invitation.
 */
export class CredentialRetrieverExtension extends RpcExtension<
  { AdmissionDiscoveryService: AdmissionDiscoveryService },
  {}
> {
  private _ctx = new Context();

  constructor(
    private readonly _request: GetAdmissionCredentialRequest,
    private readonly _onResult: Trigger<Credential>,
  ) {
    super({
      requested: {
        AdmissionDiscoveryService: getBufService<AdmissionDiscoveryService>(
          'dxos.mesh.teleport.AdmissionDiscoveryService',
        ),
      },
    });
  }

  protected override async getHandlers(): Promise<{}> {
    return {};
  }

  override async onOpen(context: ExtensionContext): Promise<void> {
    await super.onOpen(context);
    scheduleTask(this._ctx, async () => {
      try {
        const result = await this.rpc.AdmissionDiscoveryService.getAdmissionCredential(this._request);
        invariant(result.admissionCredential, 'Admission response carries no credential.');
        this._onResult.wake(result.admissionCredential);
      } catch (err: any) {
        context.close(err);
      }
    });
  }

  override async onClose(): Promise<void> {
    await this._ctx.dispose();
  }

  override async onAbort(): Promise<void> {
    await this._ctx.dispose();
  }
}

export class CredentialServerExtension extends RpcExtension<
  {},
  { AdmissionDiscoveryService: AdmissionDiscoveryService }
> {
  constructor(private readonly _space: Space) {
    super({
      exposed: {
        AdmissionDiscoveryService: getBufService<AdmissionDiscoveryService>(
          'dxos.mesh.teleport.AdmissionDiscoveryService',
        ),
      },
    });
  }

  protected override async getHandlers(): Promise<{ AdmissionDiscoveryService: AdmissionDiscoveryService }> {
    return {
      AdmissionDiscoveryService: {
        getAdmissionCredential: async (
          request: GetAdmissionCredentialRequest,
        ): Promise<GetAdmissionCredentialResponse> => {
          const memberInfo = this._space.spaceState.members.get(requirePublicKey(request.memberKey));
          if (!memberInfo?.credential) {
            throw new ProtocolError({ message: 'Space member not found.', context: { ...request } });
          }
          return create(GetAdmissionCredentialResponseSchema, { admissionCredential: memberInfo.credential });
        },
      },
    };
  }
}
