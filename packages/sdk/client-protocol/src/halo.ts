//
// Copyright 2021 DXOS.org
//

import { type MulticastObservable } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import { type Contact, type Device, type Identity, type Invitation } from '@dxos/protocols/proto/dxos/client/services';
import {
  type DeviceProfileDocument,
  type Credential,
  type Presentation,
  type ProfileDocument,
} from '@dxos/protocols/proto/dxos/halo/credentials';

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
  get credentials(): MulticastObservable<Credential[]>;

  createIdentity(options?: ProfileDocument, deviceProfile?: DeviceProfileDocument): Promise<Identity>;
  recoverIdentity(recoveryKey: Uint8Array): Promise<Identity>;
  updateProfile(profile: ProfileDocument): Promise<Identity>;

  share(options?: Partial<Invitation>): CancellableInvitation;
  join(invitation: Invitation, deviceProfile?: DeviceProfileDocument): AuthenticatingInvitation;

  /*
   * query Credentials currently known to the identity.
   * Note: Will return an empty or incomplete result if called before credentials have been loaded.
   * @experimental
   */
  queryCredentials(options: { ids?: PublicKey[]; type?: string }): Credential[];
  writeCredentials(credentials: Credential[]): Promise<void>;
  presentCredentials(options: { ids: PublicKey[]; nonce?: Uint8Array }): Promise<Presentation>;
}
