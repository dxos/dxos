//
// Copyright 2024 DXOS.org
//

import { scheduleTask, type Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { ProtocolError, schema } from '@dxos/protocols';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import {
  type AdmissionDiscoveryService,
  type GetAdmissionCredentialResponse,
  type GetAdmissionCredentialRequest,
} from '@dxos/protocols/proto/dxos/mesh/teleport';
import { type ExtensionContext, RpcExtension } from '@dxos/teleport';

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
        AdmissionDiscoveryService: schema.getService('dxos.mesh.teleport.AdmissionDiscoveryService'),
      },
    });
  }

  protected override async getHandlers(): Promise<{}> {
    return {};
  }

  override async onOpen(context: ExtensionContext) {
    await super.onOpen(context);
    scheduleTask(this._ctx, async () => {
      try {
        const result = await this.rpc.AdmissionDiscoveryService.getAdmissionCredential(this._request);
        this._onResult.wake(result.admissionCredential);
      } catch (err: any) {
        context.close(err);
      }
    });
  }

  override async onClose() {
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
        AdmissionDiscoveryService: schema.getService('dxos.mesh.teleport.AdmissionDiscoveryService'),
      },
    });
  }

  protected override async getHandlers(): Promise<{ AdmissionDiscoveryService: AdmissionDiscoveryService }> {
    return {
      AdmissionDiscoveryService: {
        getAdmissionCredential: async (
          request: GetAdmissionCredentialRequest,
        ): Promise<GetAdmissionCredentialResponse> => {
          const memberInfo = this._space.spaceState.members.get(request.memberKey);
          if (!memberInfo?.credential) {
            throw new ProtocolError('Space member not found.', request);
          }
          return { admissionCredential: memberInfo.credential };
        },
      },
    };
  }
}
