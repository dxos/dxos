//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type MulticastObservable } from '@dxos/async';
import {
  AuthenticatingInvitationObservable,
  type CancellableInvitationObservable,
  Invitation as ClientInvitation,
  InvitationEncoder,
} from '@dxos/client/invitations';
import { Group, Invitation as HaloInvitation, InvitationError } from '@dxos/halo';
import { SpaceMember } from '@dxos/protocols/proto/dxos/client/services';
import { SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';

/**
 * Bridges a {@link MulticastObservable} into an Effect {@link Stream}. The current value is
 * emitted on subscription (matching the observable's semantics); the stream runs until the
 * consumer stops or the observable errors.
 */
export const streamFromObservable = <T>(observable: MulticastObservable<T>): Stream.Stream<T> =>
  Stream.async<T, Error>((emit) => {
    const subscription = observable.subscribe(
      (value: T) => void emit.single(value),
      (err: Error) => void emit.fail(err),
    );
    return Effect.sync(() => subscription.unsubscribe());
  }).pipe(Stream.orDie);

const TERMINAL_STATES: ReadonlySet<ClientInvitation.State> = new Set([
  ClientInvitation.State.SUCCESS,
  ClientInvitation.State.CANCELLED,
  ClientInvitation.State.TIMEOUT,
  ClientInvitation.State.ERROR,
  ClientInvitation.State.EXPIRED,
]);

const toEvent = (invitation: ClientInvitation): HaloInvitation.Event | undefined => {
  switch (invitation.state) {
    case ClientInvitation.State.CONNECTING:
      return { _tag: 'connecting' };
    case ClientInvitation.State.CONNECTED:
      return { _tag: 'connected' };
    case ClientInvitation.State.READY_FOR_AUTHENTICATION:
      return { _tag: 'readyForAuthentication', authCode: invitation.authCode };
    case ClientInvitation.State.AUTHENTICATING:
      return { _tag: 'authenticating' };
    case ClientInvitation.State.SUCCESS:
      return { _tag: 'success', result: {} };
    case ClientInvitation.State.CANCELLED:
      return { _tag: 'cancelled' };
    case ClientInvitation.State.TIMEOUT:
    case ClientInvitation.State.ERROR:
    case ClientInvitation.State.EXPIRED:
      return { _tag: 'error', message: `Invitation ${ClientInvitation.State[invitation.state]}` };
    default:
      // INIT and any unmodeled state — not surfaced.
      return undefined;
  }
};

/**
 * Maps an invitation observable's state transitions to the {@link HaloInvitation.Event} stream,
 * completing after a terminal event.
 */
export const invitationEvents = (observable: CancellableInvitationObservable): Stream.Stream<HaloInvitation.Event> =>
  Stream.async<HaloInvitation.Event>((emit) => {
    const subscription = observable.subscribe(
      (invitation: ClientInvitation) => {
        const event = toEvent(invitation);
        if (event) {
          void emit.single(event);
          if (TERMINAL_STATES.has(invitation.state)) {
            void emit.end();
          }
        }
      },
      (err: Error) => {
        void emit.single({ _tag: 'error', message: err.message });
        void emit.end();
      },
    );
    return Effect.sync(() => subscription.unsubscribe());
  });

/**
 * Wraps a client invitation observable as a {@link HaloInvitation.Flow}.
 */
export const makeFlow = (
  observable: CancellableInvitationObservable,
  kind: HaloInvitation.Kind,
): HaloInvitation.Flow => ({
  id: observable.get().invitationId,
  kind,
  events: invitationEvents(observable),
  authenticate: (code: string) =>
    observable instanceof AuthenticatingInvitationObservable
      ? Effect.tryPromise({
          try: () => observable.authenticate(code),
          catch: (error) => new InvitationError({ context: { error } }),
        })
      : Effect.fail(new InvitationError({ context: { reason: 'flow is not awaiting authentication' } })),
  cancel: () => Effect.promise(() => observable.cancel()),
  code: Effect.sync(() => InvitationEncoder.encode(observable.get())),
});

/**
 * Maps {@link HaloInvitation.ShareOptions} to the client invitation options. Defaults to a
 * no-auth interactive invitation so programmatic flows complete without an auth code.
 */
export const toShareOptions = (options?: HaloInvitation.ShareOptions): Partial<ClientInvitation> => ({
  authMethod: toAuthMethod(options?.authMethod),
  type: toType(options?.type),
  ...(options?.multiUse !== undefined ? { multiUse: options.multiUse } : {}),
});

const toAuthMethod = (method?: HaloInvitation.AuthMethod): ClientInvitation.AuthMethod => {
  switch (method) {
    case 'shared-secret':
      return ClientInvitation.AuthMethod.SHARED_SECRET;
    case 'known-public-key':
      return ClientInvitation.AuthMethod.KNOWN_PUBLIC_KEY;
    case 'none':
    default:
      return ClientInvitation.AuthMethod.NONE;
  }
};

const toType = (type?: HaloInvitation.Type): ClientInvitation.Type => {
  switch (type) {
    case 'delegated':
      return ClientInvitation.Type.DELEGATED;
    case 'multiuse':
      return ClientInvitation.Type.MULTIUSE;
    case 'interactive':
    default:
      return ClientInvitation.Type.INTERACTIVE;
  }
};

/**
 * Maps a legacy space-member role to the Keyhive-aligned {@link Group.Access} level.
 * Returns `undefined` for `REMOVED` (not a current member).
 */
export const toAccess = (role: HaloSpaceMember.Role): Group.Access | undefined => {
  switch (role) {
    case HaloSpaceMember.Role.OWNER:
    case HaloSpaceMember.Role.ADMIN:
      return 'admin';
    case HaloSpaceMember.Role.EDITOR:
      return 'edit';
    case HaloSpaceMember.Role.READER:
      return 'read';
    default:
      return undefined;
  }
};

/**
 * Whether a member is currently online.
 */
export const isOnline = (member: SpaceMember): boolean => member.presence === SpaceMember.PresenceState.ONLINE;
