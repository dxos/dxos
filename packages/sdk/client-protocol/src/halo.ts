//
// Copyright 2021 DXOS.org
//

import { MulticastObservable } from '@dxos/async';
import { Contact, Device, Identity, Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { AuthenticatingInvitationObservable, CancellableInvitationObservable } from './invitations';

/**
 * TODO(burdon): Public API (move comments here).
 */
export interface Halo {
  get identity(): MulticastObservable<Identity | null>;
  get devices(): MulticastObservable<Device[]>;
  get device(): Device | undefined;
  get contacts(): MulticastObservable<Contact[]>;
  get invitations(): MulticastObservable<CancellableInvitationObservable[]>;

  createIdentity(options?: ProfileDocument): Promise<Identity>;
  recoverIdentity(recoveryKey: Uint8Array): Promise<Identity>;

  createInvitation(): CancellableInvitationObservable;
  acceptInvitation(invitation: Invitation): AuthenticatingInvitationObservable;
}
