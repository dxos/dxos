//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { CancellableObservable, CancellableObservableProvider, observableError } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Invitation, InvitationService } from '@dxos/protocols/proto/dxos/client/services';

import { AcceptInvitationEvents, CreateInvitationEvents } from './invitations';

/**
 * Client API for invitation services.
 */
// TODO(burdon): Make generic (factor out spaceKey and invitation generation).
// TODO(burdon): Options (e.g., timeout).
export class SpaceInvitationProxy {
  // prettier-ignore
  constructor(
    private readonly _service: InvitationService
  ) {}

  createInvitation(spaceKey: PublicKey): CancellableObservable<any> {
    assert(spaceKey);

    let invitationId: string;
    const observable = new CancellableObservableProvider<CreateInvitationEvents>(async () => {
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

  acceptInvitation(invitation: Invitation): CancellableObservable<any> {
    assert(invitation && invitation.spaceKey && invitation.swarmKey);

    let invitationId: string;
    const observable = new CancellableObservableProvider<AcceptInvitationEvents>(async () => {
      if (invitationId) {
        await this._service.cancelInvitation({ invitationId });
      }
    });

    const stream: Stream<Invitation> = this._service.acceptInvitation(invitation);

    stream.subscribe(
      (invitation: Invitation) => {
        assert(invitation.spaceKey?.equals(invitation.spaceKey));
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
            assert(invitation.spaceKey);
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
