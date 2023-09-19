//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';
import { AuthenticatingInvitation, CancellableInvitation } from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { ServiceContext } from '../services';

/**
 * Strip secrets from invitation before giving it to the peer.
 */
export const sanitizeInvitation = (invitation: Invitation): Invitation => {
  return {
    invitationId: invitation.invitationId,
    type: invitation.type,
    kind: invitation.kind,
    authMethod: invitation.authMethod,
    swarmKey: invitation.swarmKey,
    state: invitation.state,
    timeout: invitation.timeout,
  };
};

export type InvitationHost = {
  share(options?: Partial<Invitation>): CancellableInvitation;
};

export type InvitationGuest = {
  join(invitation: Invitation | string): AuthenticatingInvitation;
};

export type PerformInvitationCallbacks<T> = {
  onConnecting?: (value: T) => boolean | void;
  onConnected?: (value: T) => boolean | void;
  onReady?: (value: T) => boolean | void;
  onAuthenticating?: (value: T) => boolean | void;
  onSuccess?: (value: T) => boolean | void;
  onCancelled?: (value: T) => boolean | void;
  onTimeout?: (value: T) => boolean | void;
  onError?: (value: T) => boolean | void;
};

export type PerformInvitationParams = {
  host: ServiceContext | InvitationHost;
  guest: ServiceContext | InvitationGuest;
  options?: Partial<Invitation>;
  hooks?: {
    host?: PerformInvitationCallbacks<CancellableInvitation>;
    guest?: PerformInvitationCallbacks<AuthenticatingInvitation>;
  };
};

export type Result = { invitation?: Invitation; error?: Error };

export const performInvitation = ({
  host,
  guest,
  options,
  hooks,
}: PerformInvitationParams): [Promise<Result>, Promise<Result>] => {
  const hostComplete = new Trigger<Result>();
  const guestComplete = new Trigger<Result>();
  const authCode = new Trigger<string>();

  const hostObservable = createInvitation(host, options);
  hostObservable.subscribe(
    async (hostInvitation: Invitation) => {
      switch (hostInvitation.state) {
        case Invitation.State.CONNECTING: {
          if (hooks?.host?.onConnecting?.(hostObservable)) {
            break;
          }
          const guestObservable = acceptInvitation(guest, hostInvitation);
          guestObservable.subscribe(
            async (guestInvitation: Invitation) => {
              switch (guestInvitation.state) {
                case Invitation.State.CONNECTING: {
                  if (hooks?.guest?.onConnecting?.(guestObservable)) {
                    break;
                  }
                  invariant(hostInvitation.swarmKey!.equals(guestInvitation.swarmKey!));
                  break;
                }

                case Invitation.State.CONNECTED: {
                  hooks?.guest?.onConnected?.(guestObservable);
                  break;
                }

                case Invitation.State.READY_FOR_AUTHENTICATION: {
                  if (hooks?.guest?.onReady?.(guestObservable)) {
                    break;
                  }
                  await guestObservable.authenticate(await authCode.wait());
                  break;
                }

                case Invitation.State.AUTHENTICATING: {
                  hooks?.guest?.onAuthenticating?.(guestObservable);
                  break;
                }

                case Invitation.State.SUCCESS: {
                  if (hooks?.guest?.onSuccess?.(guestObservable)) {
                    break;
                  }
                  guestComplete.wake({ invitation: guestInvitation });
                  break;
                }

                case Invitation.State.CANCELLED: {
                  if (hooks?.guest?.onCancelled?.(guestObservable)) {
                    break;
                  }
                  guestComplete.wake({ invitation: guestInvitation });
                  break;
                }

                case Invitation.State.TIMEOUT: {
                  if (hooks?.guest?.onTimeout?.(guestObservable)) {
                    return;
                  }
                  guestComplete.wake({ invitation: guestInvitation });
                }
              }
            },
            (error: Error) => {
              if (hooks?.guest?.onError?.(guestObservable)) {
                return;
              }
              guestComplete.wake({ error });
            },
          );
          break;
        }

        case Invitation.State.CONNECTED: {
          hooks?.host?.onConnected?.(hostObservable);
          break;
        }

        case Invitation.State.READY_FOR_AUTHENTICATION: {
          if (hooks?.host?.onReady?.(hostObservable)) {
            break;
          }
          if (hostInvitation.authCode) {
            authCode.wake(hostInvitation.authCode);
          }
          break;
        }

        case Invitation.State.AUTHENTICATING: {
          hooks?.host?.onAuthenticating?.(hostObservable);
          break;
        }

        case Invitation.State.SUCCESS: {
          if (hooks?.host?.onSuccess?.(hostObservable)) {
            break;
          }
          hostComplete.wake({ invitation: hostInvitation });
          break;
        }

        case Invitation.State.CANCELLED: {
          if (hooks?.host?.onCancelled?.(hostObservable)) {
            break;
          }
          hostComplete.wake({ invitation: hostInvitation });
          break;
        }

        case Invitation.State.TIMEOUT: {
          if (hooks?.host?.onTimeout?.(hostObservable)) {
            break;
          }
          hostComplete.wake({ invitation: hostInvitation });
          break;
        }
      }
    },
    (error: Error) => {
      if (hooks?.host?.onError?.(hostObservable)) {
        return;
      }
      hostComplete.wake({ error });
    },
  );

  return [hostComplete.wait(), guestComplete.wait()];
};

const createInvitation = (
  host: ServiceContext | InvitationHost,
  options?: Partial<Invitation>,
): CancellableInvitation => {
  options ??= {
    authMethod: Invitation.AuthMethod.NONE,
    ...(options ?? {}),
  };

  if (host instanceof ServiceContext) {
    const hostHandler = host.getInvitationHandler({ kind: Invitation.Kind.SPACE, ...options });
    return host.invitations.createInvitation(hostHandler, options);
  }

  return host.share(options);
};

const acceptInvitation = (
  guest: ServiceContext | InvitationGuest,
  invitation: Invitation,
): AuthenticatingInvitation => {
  invitation = sanitizeInvitation(invitation);

  if (guest instanceof ServiceContext) {
    const guestHandler = guest.getInvitationHandler({ kind: invitation.kind });
    return guest.invitations.acceptInvitation(guestHandler, invitation);
  }

  return guest.join(invitation);
};
