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
import { type Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  Invitation,
  type IdentityService,
  type InvitationsService,
  QueryInvitationsResponse,
} from '@dxos/protocols/proto/dxos/client/services';
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

  async open() {
    if (this._opened) {
      return;
    }

    log('opening...', this._getInvitationContext());
    this._ctx = new Context();
    const persistentLoaded = new Trigger();
    const initialCreatedReceived = new Trigger();
    // TODO(nf): actually needed?
    const initialAcceptedReceived = new Trigger();

    const stream = this._invitationsService.queryInvitations(undefined, { timeout: RPC_TIMEOUT });
    stream.subscribe(({ action, type, invitations, existing }: QueryInvitationsResponse) => {
      switch (action) {
        case QueryInvitationsResponse.Action.ADDED: {
          log('remote invitations added', { type, invitations });
          invitations
            ?.filter((invitation) => this._matchesInvitationContext(invitation))
            .filter((invitation) => !this._invitations.has(invitation.invitationId))
            .forEach((invitation) => {
              type === QueryInvitationsResponse.Type.CREATED ? this.share(invitation) : this.join(invitation);
            });
          if (existing) {
            type === QueryInvitationsResponse.Type.CREATED
              ? initialCreatedReceived.wake()
              : initialAcceptedReceived.wake();
          }
          break;
        }
        case QueryInvitationsResponse.Action.REMOVED: {
          log('remote invitations removed', { type, invitations });
          const cache = type === QueryInvitationsResponse.Type.CREATED ? this._created : this._accepted;
          const cacheUpdate =
            type === QueryInvitationsResponse.Type.CREATED ? this._createdUpdate : this._acceptedUpdate;
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
        case QueryInvitationsResponse.Action.LOAD_COMPLETE: {
          persistentLoaded.wake();
          break;
        }
        case QueryInvitationsResponse.Action.SAVED: {
          log('remote invitations saved', { invitations });
          this._savedUpdate.emit(invitations ?? []);
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

  async close() {
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
      type: Invitation.Type.INTERACTIVE,
      authMethod: Invitation.AuthMethod.SHARED_SECRET,
      state: Invitation.State.INIT,
      swarmKey: PublicKey.random(),
      ...this._getInvitationContext(),
    };
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
      subscriber: createObservable(this._invitationsService.createInvitation(invitation)),
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
      subscriber: createObservable(this._invitationsService.acceptInvitation({ invitation, deviceProfile })),
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
      const invitationValue = (invitation as any)[key];
      if (invitationValue instanceof PublicKey && value instanceof PublicKey) {
        return acc && invitationValue.equals(value);
      } else {
        return acc && invitationValue === value;
      }
    }, true);
  }
}
