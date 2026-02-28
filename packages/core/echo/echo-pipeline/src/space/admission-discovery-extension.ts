//
// Copyright 2024 DXOS.org
//

import { type Trigger, scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { ProtocolError, type Rpc } from '@dxos/protocols';
import { create, toPublicKey } from '@dxos/protocols/buf';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import {
  AdmissionDiscoveryService,
  type GetAdmissionCredentialRequest,
  GetAdmissionCredentialResponseSchema,
} from '@dxos/protocols/buf/dxos/mesh/teleport/admission-discovery_pb';
import { BufRpcExtension, type ExtensionContext } from '@dxos/teleport';

import { type Space } from './space';

type RequestedServices = { AdmissionDiscoveryService: typeof AdmissionDiscoveryService };
type ExposedServices = { AdmissionDiscoveryService: typeof AdmissionDiscoveryService };

/**
 * Guest's side for a connection to a concrete peer in p2p network during invitation.
 */
export class CredentialRetrieverExtension extends BufRpcExtension<RequestedServices, Record<string, never>> {
  private _ctx = new Context();

  constructor(
    private readonly _request: GetAdmissionCredentialRequest,
    private readonly _onResult: Trigger<Credential>,
  ) {
    super({
      requested: { AdmissionDiscoveryService },
    });
  }

  protected override async getHandlers(): Promise<Rpc.BufServiceHandlers<Record<string, never>>> {
    return {};
  }

  override async onOpen(context: ExtensionContext): Promise<void> {
    await super.onOpen(context);
    scheduleTask(this._ctx, async () => {
      try {
        const result = await this.rpc.AdmissionDiscoveryService.getAdmissionCredential(this._request);
        this._onResult.wake(result.admissionCredential!);
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

export class CredentialServerExtension extends BufRpcExtension<Record<string, never>, ExposedServices> {
  constructor(private readonly _space: Space) {
    super({
      exposed: { AdmissionDiscoveryService },
    });
  }

  protected override async getHandlers(): Promise<Rpc.BufServiceHandlers<ExposedServices>> {
    return {
      AdmissionDiscoveryService: {
        getAdmissionCredential: async (request) => {
          const memberInfo = this._space.spaceState.members.get(toPublicKey(request.memberKey!));
          if (!memberInfo?.credential) {
            throw new ProtocolError({ message: 'Space member not found.', context: { ...request } });
          }
          return create(GetAdmissionCredentialResponseSchema, { admissionCredential: memberInfo.credential });
        },
      },
    };
  }
}
