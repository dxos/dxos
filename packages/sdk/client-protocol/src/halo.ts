//
// Copyright 2021 DXOS.org
//

import { type MulticastObservable } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import { type Invitation } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { type Contact, type Device, type Identity } from '@dxos/protocols/buf/dxos/client/services_pb';
import {
  type Credential,
  type DeviceProfileDocument,
  type Presentation,
  type ProfileDocument,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';

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
  recoverIdentity(args: { recoveryCode: string }): Promise<Identity>;
  updateProfile(profile: ProfileDocument): Promise<Identity>;

  share(options?: Partial<Invitation>): CancellableInvitation;
  join(invitation: Invitation, deviceProfile?: DeviceProfileDocument): AuthenticatingInvitation;

  /*
   * query Credentials currently known to the identity.
   * Note: Will return an empty or incomplete result if called before credentials have been loaded.
   * @experimental
   */
  queryCredentials(options?: { ids?: PublicKey[]; type?: string }): Credential[];
  writeCredentials(credentials: Credential[]): Promise<void>;
  presentCredentials(options: { ids: PublicKey[]; nonce?: Uint8Array }): Promise<Presentation>;
}
