//
// Copyright 2022 DXOS.org
//

import { Event, MulticastObservable, type Observable, PushStream, Trigger, asyncTimeout } from '@dxos/async';
import { type Stream } from '@dxos/async';
import {
  AuthenticatingInvitation,
  CancellableInvitation,
  type ClientServices,
  InvitationEncoder,
  type Invitations,
} from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { buf, bufInit, fromPublicKey } from '@dxos/protocols/buf';
import {
  Invitation,
  Invitation_AuthMethod,
  Invitation_State,
  Invitation_Type,
  InvitationSchema,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';
import {
  QueryInvitationsResponse,
  QueryInvitationsResponse_Action,
  QueryInvitationsResponse_Type,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { type DeviceProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { RPC_TIMEOUT } from '../common';

/**
 * Budget for the initial invitations snapshot. Bounded because `open()` sits on the client
 * initialization path, which the whole app boot waits on.
 */
const INITIAL_SNAPSHOT_TIMEOUT = 10_000;

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
    private readonly _invitationsService: ClientServices['InvitationsService'],
    private readonly _identityService: ClientServices['IdentityService'] | undefined,
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

    // A stream that fails or closes must not leave `open()` pending: the caller chain
    // (SpaceList._open -> Client.initialize) blocks the whole app boot on it.
    const streamTerminated = new Trigger<Error | undefined>();

    const stream = this._invitationsService.queryInvitations(undefined, { timeout: RPC_TIMEOUT });
    stream.subscribe(
      ({ action, type, invitations, existing }: QueryInvitationsResponse) => {
        switch (action) {
          case QueryInvitationsResponse_Action.ADDED: {
            log('remote invitations added', { type, invitations });
            invitations
              ?.filter((invitation) => this._matchesInvitationContext(invitation))
              .filter((invitation) => !this._invitations.has(invitation.invitationId))
              .forEach((invitation) => {
                type === QueryInvitationsResponse_Type.CREATED ? this.share(invitation) : this.join(invitation);
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
              const index = cache
                .get()
                .findIndex((invitation) => invitation.get().invitationId === removed.invitationId);
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
            this._savedUpdate.emit(invitations ?? []);
            break;
          }
        }
      },
      (error?: Error) => streamTerminated.wake(error),
    );

    this._ctx.onDispose(() => stream.close());

    // Invitations are not required for the client to be usable, so a snapshot that never arrives
    // degrades to "no invitations known yet" instead of blocking initialization forever. The
    // subscription stays live, so a late snapshot is still applied.
    try {
      await asyncTimeout(
        Promise.race([
          // Wait until remote invitations are added and removed in case .created is called early.
          Promise.all([persistentLoaded.wait(), initialAcceptedReceived.wait(), initialCreatedReceived.wait()]),
          streamTerminated.wait().then((error) => {
            throw error ?? new Error('invitations stream closed before the initial snapshot');
          }),
        ]),
        INITIAL_SNAPSHOT_TIMEOUT,
      );
    } catch (error) {
      log.warn('proceeding without the initial invitations snapshot', {
        error,
        ...this._getInvitationContext(),
      });
    }

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
    return buf.create(InvitationSchema, {
      invitationId: PublicKey.random().toHex(),
      type: Invitation_Type.INTERACTIVE,
      authMethod: Invitation_AuthMethod.SHARED_SECRET,
      state: Invitation_State.INIT,
      swarmKey: fromPublicKey(PublicKey.random()),
      ...bufInit(this._getInvitationContext()),
    });
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
      // Omit `deviceProfile` when absent (space invitations): an explicit `undefined` would still
      // drive the optional protobuf codec, which dereferences the missing message and throws,
      // silently stalling the accept RPC.
      subscriber: createObservable(
        this._invitationsService.acceptInvitation(deviceProfile ? { invitation, deviceProfile } : { invitation }),
      ),
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
      return acc && contextValuesEqual(invitationValue, value);
    }, true);
  }
}

/** The key bytes behind a context value, for the key types an invitation can carry. */
const keyBytes = (value: unknown): Uint8Array | undefined => {
  if (value instanceof PublicKey) {
    return value.asUint8Array();
  }
  if (value !== null && typeof value === 'object' && 'data' in value && value.data instanceof Uint8Array) {
    return value.data;
  }
};

/**
 * Compares one field of the invitation context.
 *
 * A key is compared by its bytes: it reaches here either as the domain `PublicKey` or as the buf
 * message, and two messages carrying the same key are distinct objects.
 */
const contextValuesEqual = (invitationValue: unknown, value: unknown): boolean => {
  const left = keyBytes(invitationValue);
  const right = keyBytes(value);
  if (left && right) {
    return left.length === right.length && left.every((byte, index) => byte === right[index]);
  }

  return invitationValue === value;
};
