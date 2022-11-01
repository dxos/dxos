//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { asyncCatch, AsyncCallbacks, Observable, ObservableImpl } from '@dxos/async';
import { Space } from '@dxos/echo-db';
import { InvitationDescriptor } from '@dxos/protocols/proto/dxos/halo/invitations';

// TODO(burdon): Timeout.
// TODO(burdon): Objective: Service impl pattern with clean open/close semantics.
// TODO(burdon): Isolate deps on protocol throughout echo-db.

import { SpaceInvitations } from './space-invitations';

interface InvitationEvents extends AsyncCallbacks {
  onConnect(invitation: InvitationDescriptor): void;
  onComplete(): void;
  onReject(): void;
}

type InvitationObservable = Observable<InvitationEvents>;

describe('observable', function () {
  it('sanity', function () {
    // TODO(burdon): Testing.
    const _ = async (space: Space, spaceInvitations: SpaceInvitations) => {
      // Impl.
      const doTest = (): InvitationObservable => {
        const observable = new ObservableImpl<InvitationEvents>();

        asyncCatch(
          async () => {
            setTimeout(() => {
              observable.callbacks?.onConnect({} as InvitationDescriptor);
            }, 100);
          },
          observable,
          30_000
        );

        return observable;
      };

      // TODO(burdon): Ability to cancel.

      // Caller.
      const observable = doTest();
      observable.subscribe({
        onConnect: (invitation) => {
          console.log(invitation);
        },
        onComplete: () => {},
        onReject: () => {},
        onTimeout: (err) => {
          console.log(err);
        },
        onError: (err: Error) => {
          console.log(err);
        }
      });
    };

    expect(true).to.be.true;
  });
});
