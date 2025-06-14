//
// Copyright 2024 DXOS.org
//

import { type MutexGuard, scheduleMicroTask, scheduleTask } from '@dxos/async';
import { type Context } from '@dxos/context';
import { sign } from '@dxos/crypto';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  EdgeAuthChallengeError,
  EdgeCallFailedError,
  type JoinSpaceRequest,
  type JoinSpaceResponseBody,
} from '@dxos/protocols';
import { schema } from '@dxos/protocols/proto';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type DeviceProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import {
  type AdmissionResponse,
  type AdmissionRequest,
  type SpaceAdmissionRequest,
} from '@dxos/protocols/proto/dxos/halo/invitations';

import { type InvitationProtocol } from './invitation-protocol';
import { type FlowLockHolder, type GuardedInvitationState } from './invitation-state';
import { tryAcquireBeforeContextDisposed } from './utils';

export interface EdgeInvitationHandlerCallbacks {
  onInvitationSuccess(response: AdmissionResponse, request: AdmissionRequest): Promise<void>;
}

export const MAX_RETRIES_PER_INVITATION = 5;
export const DEFAULT_REQUEST_RETRY_INTERVAL_MS = 3000;
export const DEFAULT_REQUEST_RETRY_JITTER_MS = 500;

export type EdgeInvitationConfig = {
  retryInterval?: number;
  retryJitter?: number;
};

export class EdgeInvitationHandler implements FlowLockHolder {
  private _flowLock: MutexGuard | undefined;

  private readonly _retryInterval: number;
  private readonly _retryJitter: number;

  constructor(
    config: EdgeInvitationConfig | undefined,
    private readonly _client: EdgeHttpClient | undefined,
    private readonly _callbacks: EdgeInvitationHandlerCallbacks,
  ) {
    this._retryInterval = config?.retryInterval ?? DEFAULT_REQUEST_RETRY_INTERVAL_MS;
    this._retryJitter = config?.retryJitter ?? DEFAULT_REQUEST_RETRY_JITTER_MS;
  }

  public handle(
    ctx: Context,
    guardedState: GuardedInvitationState,
    protocol: InvitationProtocol,
    deviceProfile?: DeviceProfileDocument,
  ): void {
    if (!this._client) {
      log('edge disabled');
      return;
    }

    const invitation = guardedState.current;
    const spaceId = invitation.spaceId;
    const canBeHandledByEdge =
      invitation.authMethod !== Invitation.AuthMethod.SHARED_SECRET &&
      invitation.type === Invitation.Type.DELEGATED &&
      invitation.kind === Invitation.Kind.SPACE &&
      spaceId != null &&
      SpaceId.isValid(spaceId);

    if (!canBeHandledByEdge) {
      log('invitation could not be handled by edge', { invitation });
      return;
    }

    ctx.onDispose(() => {
      this._flowLock?.release();
      this._flowLock = undefined;
    });

    let requestCount = 0;
    const tryHandleInvitation = async () => {
      requestCount++;
      const admissionRequest = await protocol.createAdmissionRequest(deviceProfile);
      if (admissionRequest.space) {
        try {
          await this._handleSpaceInvitationFlow(ctx, guardedState, admissionRequest.space, spaceId);
        } catch (error) {
          if (error instanceof EdgeCallFailedError) {
            log.info('join space with edge unsuccessful', {
              reason: error.message,
              retryable: error.isRetryable,
              after: error.retryAfterMs ?? this._calculateNextRetryMs(),
            });
            if (error.isRetryable && requestCount < MAX_RETRIES_PER_INVITATION) {
              scheduleTask(ctx, tryHandleInvitation, error.retryAfterMs ?? this._calculateNextRetryMs());
            }
          } else if (requestCount < MAX_RETRIES_PER_INVITATION) {
            log.info('failed to handle invitation with edge', { error });
            scheduleTask(ctx, tryHandleInvitation, this._calculateNextRetryMs());
          }
        }
      }
    };
    scheduleMicroTask(ctx, tryHandleInvitation);
  }

  private async _handleSpaceInvitationFlow(
    ctx: Context,
    guardedState: GuardedInvitationState,
    admissionRequest: SpaceAdmissionRequest,
    spaceId: SpaceId,
  ): Promise<void> {
    try {
      log('edge invitation flow');
      this._flowLock = await tryAcquireBeforeContextDisposed(ctx, guardedState.mutex);
      log.verbose('edge invitation flow acquired the lock');

      guardedState.set(this, Invitation.State.CONNECTING);

      const response = await this._joinSpaceByInvitation(guardedState, spaceId, {
        identityKey: admissionRequest.identityKey.toHex(),
        invitationId: guardedState.current.invitationId,
      });

      const admissionResponse = await this._mapToAdmissionResponse(response);
      await this._callbacks.onInvitationSuccess(admissionResponse, { space: admissionRequest });
    } catch (error) {
      guardedState.set(this, Invitation.State.ERROR);
      throw error;
    } finally {
      this._flowLock?.release();
      this._flowLock = undefined;
    }
  }

  private async _mapToAdmissionResponse(edgeResponse: JoinSpaceResponseBody): Promise<AdmissionResponse> {
    const credentialBytes = Buffer.from(edgeResponse.spaceMemberCredential, 'base64');
    const codec = schema.getCodecForType('dxos.halo.credentials.Credential');
    return {
      space: {
        credential: codec.decode(credentialBytes),
      },
    };
  }

  private async _joinSpaceByInvitation(
    guardedState: GuardedInvitationState,
    spaceId: SpaceId,
    request: JoinSpaceRequest,
  ): Promise<JoinSpaceResponseBody> {
    invariant(this._client);
    try {
      return await this._client.joinSpaceByInvitation(spaceId, request);
    } catch (error: any) {
      if (error instanceof EdgeAuthChallengeError) {
        const publicKey = guardedState.current.guestKeypair?.publicKey;
        const privateKey = guardedState.current.guestKeypair?.privateKey;
        if (!privateKey || !publicKey) {
          throw error;
        }
        const signature = sign(Buffer.from(error.challenge, 'base64'), privateKey);
        return this._client.joinSpaceByInvitation(spaceId, {
          ...request,
          signature: Buffer.from(signature).toString('base64'),
        });
      } else {
        throw error;
      }
    }
  }

  public hasFlowLock(): boolean {
    return this._flowLock != null;
  }

  private _calculateNextRetryMs(): number {
    return this._retryInterval + Math.random() * this._retryJitter;
  }
}
