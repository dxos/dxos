//
// Copyright 2021 DXOS.org
//

import { type MulticastObservable } from '@dxos/async';
import { type Contact, type Device, type Identity, type Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { type AuthenticatingInvitation, type CancellableInvitation } from './invitations';

/**
 * TODO(burdon): Public API (move comments here).
 */
export interface Halo {
  get identity(): MulticastObservable<Identity | null>;
  get devices(): MulticastObservable<Device[]>;
  get device(): Device | undefined;
  get contacts(): MulticastObservable<Contact[]>;
  get invitations(): MulticastObservable<CancellableInvitation[]>;

  createIdentity(options?: ProfileDocument): Promise<Identity>;
  recoverIdentity(recoveryKey: Uint8Array): Promise<Identity>;
  updateProfile(profile: ProfileDocument): Promise<Identity>;

  share(): CancellableInvitation;
  join(invitation: Invitation): AuthenticatingInvitation;
}
