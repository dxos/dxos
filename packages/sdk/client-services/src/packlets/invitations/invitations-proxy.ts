//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { CancellableObservable, CancellableObservableProvider, observableError } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import { Invitation, InvitationsService } from '@dxos/protocols/proto/dxos/client/services';

import { InvitationEvents, InvitationsProxy } from './invitations';

/**
 * Adapts invitations service observable to client/service stream.
 * NOTE: Both HALO and Data Spaces use the same client/service interfaces.
 */
// TODO(burdon): Options (e.g., timeout).
export abstract class AbstractInvitationsProxy<T> implements InvitationsProxy<T> {
  // prettier-ignore
  constructor(
    private readonly _invitationsService: InvitationsService
  ) {}

  // TODO(burdon): Invitation type.
  abstract createInvitationObject(context: T): Invitation;

  createInvitation(context: T): CancellableObservable<any> {
    assert(context);

    let invitationId: string;
    const observable = new CancellableObservableProvider<InvitationEvents>(async () => {
      if (invitationId) {
        await this._invitationsService.cancelInvitation({ invitationId });
      }
    });

    const stream: Stream<Invitation> = this._invitationsService.createInvitation(this.createInvitationObject(context));

    stream.subscribe(
      (invitation: Invitation) => {
        switch (invitation.state) {
          case Invitation.State.CONNECTING: {
            assert(invitation.invitationId);
            invitationId = invitation.invitationId;
            observable.callbacks?.onConnecting?.(invitation);
            break;
          }

          case Invitation.State.CONNECTED: {
            observable.callbacks?.onConnected?.(invitation);
            break;
          }

          case Invitation.State.SUCCESS: {
            observable.callbacks?.onSuccess?.(invitation);
            observable.unsubscribe();
            break;
          }

          case Invitation.State.CANCELLED: {
            observable.callbacks?.onCancelled?.();
            observable.unsubscribe();
            break;
          }

          default: {
            log.error(`Invalid state: ${invitation.state}`);
          }
        }
      },
      (err) => {
        if (err) {
          observableError(observable, err);
        }
      }
    );

    return observable;
  }

  acceptInvitation(invitation: Invitation): CancellableObservable<any> {
    assert(invitation && invitation.swarmKey);

    let invitationId: string;
    const observable = new CancellableObservableProvider<InvitationEvents>(async () => {
      if (invitationId) {
        await this._invitationsService.cancelInvitation({ invitationId });
      }
    });

    const stream: Stream<Invitation> = this._invitationsService.acceptInvitation(invitation);

    stream.subscribe(
      (invitation: Invitation) => {
        assert(invitation.invitationId);

        switch (invitation.state) {
          case Invitation.State.CONNECTING: {
            observable.callbacks?.onConnecting?.(invitation);
            break;
          }

          case Invitation.State.CONNECTED: {
            observable.callbacks?.onConnected?.(invitation);
            break;
          }

          case Invitation.State.SUCCESS: {
            observable.callbacks?.onSuccess?.(invitation);
            break;
          }

          case Invitation.State.CANCELLED: {
            observable.callbacks?.onCancelled?.();
            break;
          }

          default: {
            log.error(`Invalid state: ${invitation.state}`);
          }
        }
      },
      (err) => {
        if (err) {
          observableError(observable, err);
        }
      }
    );

    return observable;
  }
}
