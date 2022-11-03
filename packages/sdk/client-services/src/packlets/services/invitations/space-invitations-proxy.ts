//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { CancellableObservable, CancellableObservableProvider, TimeoutError } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { Invitation, InvitationService } from '@dxos/protocols/proto/dxos/client/services';

import { AcceptInvitationEvents, CreateInvitationEvents } from './invitations';

/**
 * Client API for invitation services.
 */
// TODO(burdon): Make generic (factor out spaceKey and invitation generation).
export class SpaceInvitationProxy {
  // prettier-ignore
  constructor(
    private readonly _service: InvitationService
  ) {}

  createInvitation(spaceKey: PublicKey, options = {}): CancellableObservable<any> {
    let invitationId: string;
    const observer = new CancellableObservableProvider<CreateInvitationEvents>(async () => {
      if (invitationId) {
        await this._service.cancelInvitation({ invitationId });
      }
    });

    const stream: Stream<Invitation> = this._service.createInvitation({
      spaceKey
    });

    stream.subscribe(
      (invitation: Invitation) => {
        assert(invitation.spaceKey?.equals(spaceKey));
        assert(invitation.invitationId);

        switch (invitation.state) {
          case Invitation.State.CONNECTING: {
            observer.callbacks?.onConnecting(invitation);
            break;
          }

          case Invitation.State.CONNECTED: {
            observer.callbacks?.onConnected(invitation);
            break;
          }

          case Invitation.State.SUCCESS: {
            observer.callbacks?.onSuccess(invitation);
            break;
          }

          case Invitation.State.CANCELLED: {
            observer.callbacks?.onCancelled();
            break;
          }

          case Invitation.State.TIMEOUT: {
            observer.callbacks?.onTimeout(new TimeoutError());
            break;
          }

          case Invitation.State.ERROR: {
            observer.callbacks?.onError(new Error(`Service error: ${invitation.errorCode}`));
            break;
          }
        }
      },
      (err) => {
        if (err) {
          observer.callbacks!.onError(err);
        }
      }
    );

    return observer;
  }

  acceptInvitation(spaceKey: PublicKey, options = {}): CancellableObservable<any> {
    let invitationId: string;
    const observer = new CancellableObservableProvider<AcceptInvitationEvents>(async () => {
      if (invitationId) {
        await this._service.cancelInvitation({ invitationId });
      }
    });

    const stream: Stream<Invitation> = this._service.acceptInvitation({
      spaceKey
    });

    stream.subscribe(
      (invitation: Invitation) => {
        assert(invitation.spaceKey?.equals(spaceKey));
        assert(invitation.invitationId);

        switch (invitation.state) {
          case Invitation.State.CONNECTING: {
            observer.callbacks?.onConnecting(invitation);
            break;
          }

          case Invitation.State.CONNECTED: {
            observer.callbacks?.onConnected(invitation);
            break;
          }

          case Invitation.State.SUCCESS: {
            assert(invitation.spaceKey);
            observer.callbacks?.onSuccess(invitation.spaceKey);
            break;
          }

          case Invitation.State.CANCELLED: {
            observer.callbacks?.onCancelled();
            break;
          }

          case Invitation.State.TIMEOUT: {
            observer.callbacks?.onTimeout(new TimeoutError());
            break;
          }

          case Invitation.State.ERROR: {
            observer.callbacks?.onError(new Error(`Service error: ${invitation.errorCode}`));
            break;
          }
        }
      },
      (err) => {
        if (err) {
          observer.callbacks!.onError(err);
        }
      }
    );

    return observer;
  }
}
