//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Event, trigger } from '@dxos/async';
import { InvitationDescriptor } from '@dxos/client-services';
import { Stream } from '@dxos/codec-protobuf';
import { throwUnhandledRejection } from '@dxos/debug';
import {
  AuthenticateInvitationRequest,
  InvitationRequest as InvitationRequestProto,
  InvitationState,
  RedeemedInvitation as RedeemedInvitationProto
} from '@dxos/protocols/proto/dxos/client';
import { InvitationDescriptor as InvitationDescriptorProto } from '@dxos/protocols/proto/dxos/echo/invitation';
import { RpcClosedError } from '@dxos/rpc';

import { InvitationRequest } from '../api';

export interface CreateInvitationRequestOpts {
  stream: Stream<InvitationRequestProto>;
}

export interface HandleInvitationRedemptionOpts {
  stream: Stream<RedeemedInvitationProto>;
  invitationDescriptor: InvitationDescriptor;
  onAuthenticate: (request: AuthenticateInvitationRequest) => Promise<void>;
}

export interface HandleInvitationRedemptionResult {
  waitForFinish: () => Promise<RedeemedInvitationProto>;
  authenticate: (secret: Uint8Array) => void;
}

export class InvitationProxy {
  readonly activeInvitations: InvitationRequest[] = [];
  readonly invitationsUpdate = new Event();

  private _isClosed = false;

  close() {
    this._isClosed = true;
  }

  async createInvitationRequest({
    stream
  }: CreateInvitationRequestOpts): Promise<InvitationRequest> {
    return new Promise((resolve, reject) => {
      const connected = new Event();
      const finished = new Event();
      const error = new Event<Error>();
      let invitation: InvitationRequest;

      connected.on(() => this.invitationsUpdate.emit());

      stream.subscribe(
        (invitationMsg) => {
          if (!invitation) {
            assert(invitationMsg.descriptor, 'Missing invitation descriptor.');
            const descriptor = InvitationDescriptor.fromProto(
              invitationMsg.descriptor
            );
            invitation = new InvitationRequest(
              descriptor,
              connected,
              finished,
              error
            );
            invitation.canceled.on(() => this._removeInvitation(invitation));

            this.activeInvitations.push(invitation);
            this.invitationsUpdate.emit();
            resolve(invitation);
          }

          if (
            invitationMsg.state === InvitationState.CONNECTED &&
            !invitation.hasConnected
          ) {
            connected.emit();
          }

          if (invitationMsg.state === InvitationState.SUCCESS) {
            finished.emit();
            this._removeInvitation(invitation);
            stream.close();
          }

          if (invitationMsg.state === InvitationState.ERROR) {
            assert(invitationMsg.error, 'Unknown error.');
            const err = new Error(invitationMsg.error);
            reject(err);
            error.emit(err);
          }
        },
        (err) => {
          if (err && !this._isClosed) {
            // TODO(rzadp): Handle retry.
            console.error(err);
            reject(error);
          }
        }
      );
    });
  }

  protected _removeInvitation(invitation: InvitationRequest) {
    const index = this.activeInvitations.findIndex(
      (activeInvitation) => activeInvitation === invitation
    );
    this.activeInvitations.splice(index, 1);
    this.invitationsUpdate.emit();
  }

  static handleInvitationRedemption({
    stream,
    invitationDescriptor,
    onAuthenticate
  }: HandleInvitationRedemptionOpts): HandleInvitationRedemptionResult {
    const [getInvitationProcess, resolveInvitationProcess] =
      trigger<RedeemedInvitationProto>();
    const [waitForFinish, resolveFinish] = trigger<RedeemedInvitationProto>();

    stream.subscribe(
      async (process) => {
        resolveInvitationProcess(process);

        if (process.state === InvitationState.SUCCESS) {
          resolveFinish(process);
        } else if (process.state === InvitationState.ERROR) {
          assert(process.error);
          const error = new Error(process.error);
          // TODO(dmaretskyi): Should result in an error inside the returned Invitation, rejecting the promise in Invitation.wait().
          throwUnhandledRejection(error);
        }
      },
      (err) => {
        if (err && !(err instanceof RpcClosedError)) {
          // TODO(dmaretskyi): Should result in an error inside the returned Invitation, rejecting the promise in Invitation.wait().
          throwUnhandledRejection(err);
        }
      }
    );

    const authenticate = async (secret: Uint8Array) => {
      if (
        invitationDescriptor.type === InvitationDescriptorProto.Type.OFFLINE
      ) {
        throw new Error('Cannot authenticate offline invitation.');
      }

      const invitationProcess = await getInvitationProcess();

      await onAuthenticate({
        processId: invitationProcess.id,
        secret
      });
    };

    if (
      invitationDescriptor.secret &&
      invitationDescriptor.type === InvitationDescriptorProto.Type.INTERACTIVE
    ) {
      // Authenticate straight away, if secret is already provided.
      void authenticate(invitationDescriptor.secret);
    }

    return {
      authenticate,
      waitForFinish
    };
  }
}
