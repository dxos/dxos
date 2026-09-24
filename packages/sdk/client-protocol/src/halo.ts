//
// Copyright 2021 DXOS.org
//

import { type MulticastObservable } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import { type Invitation } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import {
  type Contact,
  type Device,
  type Identity,
  type RecoverIdentityRequest_ExternalSignature,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import {
  type Credential,
  type DeviceProfileDocument,
  type Presentation,
  type ProfileDocument,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type InboxService } from '@dxos/protocols/rpc';

import { type AuthenticatingInvitation, type CancellableInvitation } from './invitations/index.ts';

/**
 * Ways to re-admit a device to an existing identity. `external` presents a signature from a key
 * held outside HALO (a passkey) over a challenge from `IdentityService.requestRecoveryChallenge`.
 */
export type RecoverIdentityArgs =
  | { recoveryCode: string }
  | { recoveryProof: string }
  | { token: string }
  | { external: RecoverIdentityRequest_ExternalSignature };

/**
 * User-to-user notices relayed through EDGE; today only space invitation notices.
 */
export interface HaloInbox {
  /**
   * Pending notices whose signature, sender and recipient have been verified, oldest first.
   * Not filtered by contact book: callers decide which senders to show.
   */
  get notices(): MulticastObservable<readonly InboxService.Notice[]>;

  /** Tells a known identity it has been admitted to a space. */
  send(request: InboxService.SendRequest): Promise<void>;

  /** Removes notices on every device of this identity. */
  ack(ids: readonly string[]): Promise<void>;
}

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
  get inbox(): HaloInbox;

  createIdentity(options?: ProfileDocument, deviceProfile?: DeviceProfileDocument): Promise<Identity>;
  recoverIdentity(args: RecoverIdentityArgs): Promise<Identity>;
  updateProfile(profile: ProfileDocument): Promise<Identity>;

  /**
   * Closes and deletes every space and the identity itself, then wipes the storage they left
   * behind (automerge documents, hypercore feeds, the feed store, the index tables and the
   * keyring). The client stays open, so {@link createIdentity} may be called straight afterwards.
   */
  deleteIdentity(): Promise<void>;

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
