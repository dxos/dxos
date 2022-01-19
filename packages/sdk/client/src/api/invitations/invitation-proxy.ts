//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { InvitationDescriptor } from '@dxos/echo-db';
import assert from 'assert';
import { InvitationRequest as InvitationRequestProto, InvitationState } from '../../proto/gen/dxos/client';
import { InvitationRequest } from './invitation-request';

export interface CreateInvitationRequestOpts {
  stream: Stream<InvitationRequestProto>
}

export class InvitationProxy {
  readonly activeInvitations: InvitationRequest[] = [];
  readonly invitationsUpdate = new Event();

  protected async createInvitationRequest ({stream}: CreateInvitationRequestOpts): Promise<InvitationRequest> {
    return new Promise((resolve, reject) => {
      const connected = new Event();
      const finished = new Event();
      const error = new Event<Error>();
      let invitation: InvitationRequest;

      connected.on(() => this.invitationsUpdate.emit());

      stream.subscribe(invitationMsg => {
        if (!invitation) {
          assert(invitationMsg.descriptor, 'Missing invitation descriptor.');
          const descriptor = InvitationDescriptor.fromProto(invitationMsg.descriptor);
          invitation = new InvitationRequest(descriptor, connected, finished, error);
          invitation.canceled.on(() => this._removeInvitation(invitation));

          this.activeInvitations.push(invitation);
          this.invitationsUpdate.emit();
          resolve(invitation);
        }

        if (invitationMsg.state === InvitationState.CONNECTED && !invitation.hasConnected) {
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
      }, error => {
        if (error) {
          console.error(error);
          reject(error);
          // TODO(rzadp): Handle retry.
        }
      });
    });
  }

  protected _removeInvitation (invitation: InvitationRequest) {
    const index = this.activeInvitations.findIndex(activeInvitation => activeInvitation === invitation);
    this.activeInvitations.splice(index, 1);
    this.invitationsUpdate.emit();
  }
}
