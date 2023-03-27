//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Stream } from '@dxos/codec-protobuf';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { AuthenticatingInvitationObservable, CancellableInvitationObservable, InvitationsService } from './invitations';
import { InvitationsOptions, InvitationsHandler } from './invitations-handler';

/**
 * Adapts invitations service observable to client/service stream.
 * Common base class for HALO and Spaces implementations.
 */
export interface InvitationsProxy<T = void> extends InvitationsHandler<T> {
  getInvitationOptions(context: T): Invitation;
}

export abstract class AbstractInvitationsProxy<T = void> implements InvitationsProxy<T> {
  // prettier-ignore
  constructor(
    private readonly _invitationsService: InvitationsService
  ) {}

  abstract getInvitationOptions(context: T): Invitation;

  createInvitation(context: T, options?: InvitationsOptions): CancellableInvitationObservable {
    const invitation: Invitation = { ...this.getInvitationOptions(context), ...options };
    const stream: Stream<Invitation> = this._invitationsService.createInvitation(invitation);
    const observable = new CancellableInvitationObservable({
      initialInvitation: invitation,
      subscriber: (observer) => {
        stream.subscribe(
          (invitation: Invitation) => {
            observer.next(invitation);
          },
          (err) => {
            err && observer.error(err);
          }
        );
      },
      onCancel: async () => {
        const invitationId = observable.get().invitationId;
        assert(invitationId, 'Invitation missing identifier');
        await this._invitationsService.cancelInvitation({ invitationId });
      }
    });

    return observable;
  }

  acceptInvitation(invitation: Invitation, options?: InvitationsOptions): AuthenticatingInvitationObservable {
    assert(invitation && invitation.swarmKey);

    const stream: Stream<Invitation> = this._invitationsService.acceptInvitation({ ...invitation, ...options });
    const observable = new AuthenticatingInvitationObservable({
      initialInvitation: invitation,
      subscriber: (observer) => {
        stream.subscribe(
          (invitation: Invitation) => {
            observer.next(invitation);
          },
          (err) => {
            err && observer.error(err);
          }
        );
      },
      onCancel: async () => {
        const invitationId = observable.get().invitationId;
        assert(invitationId, 'Invitation missing identifier');
        await this._invitationsService.cancelInvitation({ invitationId });
      },
      onAuthenticate: async (authenticationCode: string) => {
        const invitationId = observable.get().invitationId;
        assert(invitationId, 'Invitation missing identifier');
        await this._invitationsService.authenticate({ invitationId, authenticationCode });
      }
    });

    return observable;
  }
}
