//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event, MulticastObservable, Observable, PushStream } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Invitation, InvitationsService, QueryInvitationsResponse } from '@dxos/protocols/proto/dxos/client/services';

import { AuthenticatingInvitationObservable, CancellableInvitationObservable } from './invitations';

/**
 * Create an observable from an RPC stream.
 */
// TODO(wittjosiah): Factor out.
const createObservable = <T>(rpcStream: Stream<T>): Observable<T> => {
  const pushStream = new PushStream<T>();

  rpcStream.subscribe(
    (value: T) => {
      pushStream.next(value);
    },
    (err?: Error) => {
      if (err) {
        pushStream.error(err);
      } else {
        pushStream.complete();
      }
    }
  );

  return pushStream.observable;
};

export class InvitationsProxy {
  private _ctx!: Context;
  private _createdUpdate = new Event<CancellableInvitationObservable[]>();
  private _acceptedUpdate = new Event<AuthenticatingInvitationObservable[]>();
  private _created = MulticastObservable.from(this._createdUpdate, []);
  private _accepted = MulticastObservable.from(this._acceptedUpdate, []);
  // Invitations originating from this proxy.
  private _invitations = new Set<string>();

  // prettier-ignore
  constructor(
    private readonly _invitationsService: InvitationsService,
    private readonly _getInvitationContext: () => Partial<Invitation> & Pick<Invitation, 'kind'>
  ) {}

  get created(): MulticastObservable<CancellableInvitationObservable[]> {
    return this._created;
  }

  get accepted(): MulticastObservable<AuthenticatingInvitationObservable[]> {
    return this._accepted;
  }

  async open() {
    this._ctx = new Context();

    const stream = this._invitationsService.queryInvitations();
    stream.subscribe(({ added, removed }: QueryInvitationsResponse) => {
      if (
        added?.created &&
        this._matchesInvitationContext(added.created) &&
        !this._invitations.has(added.created.invitationId)
      ) {
        log('remote invitation created', { invitation: added.created });
        this.createInvitation(added.created);
      }

      if (
        added?.accepted &&
        this._matchesInvitationContext(added.accepted) &&
        !this._invitations.has(added.accepted.invitationId)
      ) {
        log('remote invitation accepted', { invitation: added.accepted });
        this.acceptInvitation(added.accepted);
      }

      if (removed?.created) {
        const index = this._created
          .get()
          .findIndex((invitation) => invitation.get().invitationId === removed.created?.invitationId);
        void this._created.get()[index]?.cancel();
        index >= 0 &&
          this._createdUpdate.emit([...this._created.get().slice(0, index), ...this._created.get().slice(index + 1)]);
      }

      if (removed?.accepted) {
        const index = this._accepted
          .get()
          .findIndex((invitation) => invitation.get().invitationId === removed.accepted?.invitationId);
        void this._accepted.get()[index]?.cancel();
        index >= 0 &&
          this._acceptedUpdate.emit([
            ...this._accepted.get().slice(0, index),
            ...this._accepted.get().slice(index + 1)
          ]);
      }
    });

    this._ctx.onDispose(() => stream.close());
  }

  async close() {
    await this._ctx.dispose();
    this._createdUpdate.emit([]);
    this._acceptedUpdate.emit([]);
  }

  getInvitationOptions(): Invitation {
    return {
      invitationId: PublicKey.random().toHex(),
      type: Invitation.Type.INTERACTIVE,
      authMethod: Invitation.AuthMethod.SHARED_SECRET,
      state: Invitation.State.INIT,
      swarmKey: PublicKey.random(),
      ...this._getInvitationContext()
    };
  }

  createInvitation(options?: Partial<Invitation>): CancellableInvitationObservable {
    const invitation: Invitation = { ...this.getInvitationOptions(), ...options };
    this._invitations.add(invitation.invitationId);

    const existing = this._created.get().find((created) => created.get().invitationId === invitation.invitationId);
    if (existing) {
      return existing;
    }

    const observable = new CancellableInvitationObservable({
      initialInvitation: invitation,
      subscriber: createObservable(this._invitationsService.createInvitation(invitation)),
      onCancel: async () => {
        const invitationId = observable.get().invitationId;
        assert(invitationId, 'Invitation missing identifier');
        await this._invitationsService.cancelInvitation({ invitationId });
      }
    });
    this._createdUpdate.emit([...this._created.get(), observable]);

    return observable;
  }

  acceptInvitation(invitation: Invitation): AuthenticatingInvitationObservable {
    assert(invitation && invitation.swarmKey);
    this._invitations.add(invitation.invitationId);

    const existing = this._accepted.get().find((accepted) => accepted.get().invitationId === invitation.invitationId);
    if (existing) {
      return existing;
    }

    const observable = new AuthenticatingInvitationObservable({
      initialInvitation: invitation,
      subscriber: createObservable(this._invitationsService.acceptInvitation({ ...invitation })),
      onCancel: async () => {
        const invitationId = observable.get().invitationId;
        assert(invitationId, 'Invitation missing identifier');
        await this._invitationsService.cancelInvitation({ invitationId });
      },
      onAuthenticate: async (authCode: string) => {
        const invitationId = observable.get().invitationId;
        assert(invitationId, 'Invitation missing identifier');
        await this._invitationsService.authenticate({ invitationId, authCode });
      }
    });
    this._acceptedUpdate.emit([...this._accepted.get(), observable]);

    return observable;
  }

  deleteInvitation(invitationId: string): Promise<void> {
    return this._invitationsService.deleteInvitation({ invitationId });
  }

  private _matchesInvitationContext(invitation: Invitation): boolean {
    const context = this._getInvitationContext();
    log('checking invitation context', { invitation, context });
    return Object.entries(context).reduce((acc, [key, value]) => {
      const invitationValue = (invitation as any)[key];
      if (invitationValue instanceof PublicKey && value instanceof PublicKey) {
        return acc && invitationValue.equals(value);
      } else {
        return acc && invitationValue === value;
      }
    }, true);
  }
}
