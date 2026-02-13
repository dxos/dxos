//
// Copyright 2022 DXOS.org
//

import { Event, MulticastObservable, type Observable, PushStream, Trigger } from '@dxos/async';
import {
  AuthenticatingInvitation,
  CancellableInvitation,
  InvitationEncoder,
  type Invitations,
} from '@dxos/client-protocol';
import { type Stream } from '@dxos/codec-protobuf/stream';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { EMPTY, encodePublicKey } from '@dxos/protocols/buf';
import {
  type Invitation,
  Invitation_AuthMethod,
  Invitation_State,
  Invitation_Type,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';
import {
  type QueryInvitationsResponse,
  QueryInvitationsResponse_Action,
  QueryInvitationsResponse_Type,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { type IdentityService, type InvitationsService } from '@dxos/protocols/proto/dxos/client/services';
import { type DeviceProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { RPC_TIMEOUT } from '../common';

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
    },
  );

  return pushStream.observable;
};

export class InvitationsProxy implements Invitations {
  private _ctx!: Context;
  private _createdUpdate = new Event<CancellableInvitation[]>();
  private _acceptedUpdate = new Event<AuthenticatingInvitation[]>();
  private _savedUpdate = new Event<Invitation[]>();
  private _created = MulticastObservable.from(this._createdUpdate, []);
  private _accepted = MulticastObservable.from(this._acceptedUpdate, []);
  private _saved = MulticastObservable.from(this._savedUpdate, []);
  // Invitations originating from this proxy.
  private _invitations = new Set<string>();
  private _invitationsLoaded = new Trigger();

  private _opened = false;

  constructor(
    private readonly _invitationsService: InvitationsService,
    private readonly _identityService: IdentityService | undefined,
    private readonly _getInvitationContext: () => Partial<Invitation> & Pick<Invitation, 'kind'>,
  ) {}

  get created(): MulticastObservable<CancellableInvitation[]> {
    return this._created;
  }

  get accepted(): MulticastObservable<AuthenticatingInvitation[]> {
    return this._accepted;
  }

  /**
   * @test-only
   */
  get saved(): MulticastObservable<Invitation[]> {
    return this._saved;
  }

  get isOpen(): boolean {
    return this._opened;
  }

  async open(): Promise<void> {
    if (this._opened) {
      return;
    }

    log('opening...', this._getInvitationContext());
    this._ctx = new Context();
    const persistentLoaded = new Trigger();
    const initialCreatedReceived = new Trigger();
    // TODO(nf): actually needed?
    const initialAcceptedReceived = new Trigger();

    const stream = this._invitationsService.queryInvitations(EMPTY as never, { timeout: RPC_TIMEOUT });
    (stream as never as Stream<QueryInvitationsResponse>).subscribe((msg: QueryInvitationsResponse) => {
      const { action, type, invitations, existing } = msg;
      switch (action) {
        case QueryInvitationsResponse_Action.ADDED: {
          log('remote invitations added', { type, invitations });
          invitations
            ?.filter((invitation) => this._matchesInvitationContext(invitation as never))
            .filter((invitation) => !this._invitations.has(invitation.invitationId))
            .forEach((invitation) => {
              type === QueryInvitationsResponse_Type.CREATED
                ? this.share(invitation as never)
                : this.join(invitation as never);
            });
          if (existing) {
            type === QueryInvitationsResponse_Type.CREATED
              ? initialCreatedReceived.wake()
              : initialAcceptedReceived.wake();
          }
          break;
        }
        case QueryInvitationsResponse_Action.REMOVED: {
          log('remote invitations removed', { type, invitations });
          const cache = type === QueryInvitationsResponse_Type.CREATED ? this._created : this._accepted;
          const cacheUpdate =
            type === QueryInvitationsResponse_Type.CREATED ? this._createdUpdate : this._acceptedUpdate;
          invitations?.forEach((removed) => {
            const index = cache.get().findIndex((invitation) => invitation.get().invitationId === removed.invitationId);
            void cache.get()[index]?.cancel();
            index >= 0 &&
              cacheUpdate.emit([
                ...cache.get().slice(0, index),
                ...cache.get().slice(index + 1),
              ] as AuthenticatingInvitation[]);
          });
          existing && initialAcceptedReceived.wake();
          break;
        }
        case QueryInvitationsResponse_Action.LOAD_COMPLETE: {
          persistentLoaded.wake();
          break;
        }
        case QueryInvitationsResponse_Action.SAVED: {
          log('remote invitations saved', { invitations });
          this._savedUpdate.emit((invitations ?? []) as never);
          break;
        }
      }
    });

    this._ctx.onDispose(() => stream.close());
    await persistentLoaded.wait();
    // wait until remote invitations are added and removed in case .created is called early.
    await initialAcceptedReceived.wait();
    await initialCreatedReceived.wait();
    this._opened = true;
    log('opened', this._getInvitationContext());
  }

  async close(): Promise<void> {
    if (!this._opened) {
      return;
    }

    log('closing...', this._getInvitationContext());
    await this._ctx.dispose();
    this._createdUpdate.emit([]);
    this._acceptedUpdate.emit([]);
    log('closed', this._getInvitationContext());
  }

  getInvitationOptions(): Invitation {
    return {
      invitationId: PublicKey.random().toHex(),
      type: Invitation_Type.INTERACTIVE,
      authMethod: Invitation_AuthMethod.SHARED_SECRET,
      state: Invitation_State.INIT,
      swarmKey: encodePublicKey(PublicKey.random()),
      ...this._getInvitationContext(),
    } as never;
  }

  // TODO(nf): Some way to retrieve observables for resumed invitations?
  share(options?: Partial<Invitation>): CancellableInvitation {
    const invitation: Invitation = { ...this.getInvitationOptions(), ...options };
    this._invitations.add(invitation.invitationId);

    const existing = this._created.get().find((created) => created.get().invitationId === invitation.invitationId);
    if (existing) {
      return existing;
    }

    const observable = new CancellableInvitation({
      initialInvitation: invitation,
      subscriber: createObservable(this._invitationsService.createInvitation(invitation as never)) as never,
      onCancel: async () => {
        const invitationId = observable.get().invitationId;
        invariant(invitationId, 'Invitation missing identifier');
        await this._invitationsService.cancelInvitation({ invitationId });
      },
    });
    this._createdUpdate.emit([...this._created.get(), observable]);

    return observable;
  }

  join(invitation: Invitation | string, deviceProfile?: DeviceProfileDocument): AuthenticatingInvitation {
    if (typeof invitation === 'string') {
      invitation = InvitationEncoder.decode(invitation);
    }
    invariant(invitation && invitation.swarmKey);
    this._invitations.add(invitation.invitationId);

    const id = invitation.invitationId;
    const existing = this._accepted.get().find((accepted) => accepted.get().invitationId === id);
    if (existing) {
      return existing;
    }

    const observable = new AuthenticatingInvitation({
      initialInvitation: invitation,
      subscriber: createObservable(this._invitationsService.acceptInvitation({ invitation: invitation as never, deviceProfile })) as never,
      onCancel: async () => {
        const invitationId = observable.get().invitationId;
        invariant(invitationId, 'Invitation missing identifier');
        await this._invitationsService.cancelInvitation({ invitationId });
      },
      onAuthenticate: async (authCode: string) => {
        const invitationId = observable.get().invitationId;
        invariant(invitationId, 'Invitation missing identifier');

        await this._invitationsService.authenticate({ invitationId, authCode });
      },
    });
    this._acceptedUpdate.emit([...this._accepted.get(), observable]);

    return observable;
  }

  private _matchesInvitationContext(invitation: Invitation): boolean {
    const context = this._getInvitationContext();
    log('checking invitation context', { invitation, context });
    return Object.entries(context).reduce((acc, [key, value]) => {
      const invitationValue = (invitation as Record<string, unknown>)[key];
      if (invitationValue instanceof PublicKey && value instanceof PublicKey) {
        return acc && invitationValue.equals(value);
      } else {
        return acc && invitationValue === value;
      }
    }, true);
  }
}
