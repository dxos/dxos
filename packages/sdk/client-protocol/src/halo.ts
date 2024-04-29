//
// Copyright 2021 DXOS.org
//

import { type ObservableProvider, type MulticastObservable } from '@dxos/async';
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

  createIdentity(options?: ProfileDocument, deviceProfile?: DeviceProfileDocument): Promise<Identity>;
  recoverIdentity(recoveryKey: Uint8Array): Promise<Identity>;
  updateProfile(profile: ProfileDocument): Promise<Identity>;

  share(options?: Partial<Invitation>): CancellableInvitation;
  join(invitation: Invitation, deviceProfile?: DeviceProfileDocument): AuthenticatingInvitation;

  // TODO(wittjosiah): Migrate to multicast observable.
  queryCredentials(options?: {
    ids?: PublicKey[];
    type?: string;
  }): ObservableProvider<
    { onUpdate: (credentials: Credential[]) => void; onError: (error?: Error) => void },
    Credential[]
  >;
  writeCredentials(credentials: Credential[]): Promise<void>;
  presentCredentials(options: { ids: PublicKey[]; nonce?: Uint8Array }): Promise<Presentation>;
}
