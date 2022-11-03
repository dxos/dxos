//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { CreateInvitationEvents } from 'packages/sdk/client-services/src/packlets/services/invitations/space-invitations';

import { CancellableObservable, CancellableObservableProvider } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { Invitation, InvitationService } from '@dxos/protocols/proto/dxos/client/services';

/**
 *
 */
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
        // assert(invitation.invitationId); // TODO(burdon): Assert.
        invitationId = invitation.invitationId!;

        // TODO(burdon): Auto-map;
        // TODO(burdon): Delegate timeout to error.

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
            // TODO(burdon): pass invitation to all callbacks.
            observer.callbacks?.onCancelled();
            break;
          }

          case Invitation.State.TIMEOUT: {
            // observer.callbacks?.onTimeout(); // TODO(burdon): ???
            break;
          }

          case Invitation.State.ERROR: {
            observer.callbacks?.onError(invitation.errorCode);
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
