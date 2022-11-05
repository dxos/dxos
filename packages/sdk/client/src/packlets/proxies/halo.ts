//
// Copyright 2022 DXOS.org
//

import { ResultSet } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { Profile } from '@dxos/protocols/proto/dxos/client';
import { DeviceInfo } from '@dxos/protocols/proto/dxos/halo/credentials/identity';

import { Contact, CreateProfileOptions } from '../proxies';
import { InvitationChallenge, InvitationRequest, InvitationWrapper } from './invitations';

/**
 * HALO API.
 */
// TODO(burdon): Separate public API form implementation (move comments here).
export interface Halo {
  info: { key?: PublicKey };

  get profile(): Profile | undefined;
  createProfile(options?: CreateProfileOptions): Promise<Profile>;
  recoverProfile(seedPhrase: string): Promise<Profile>;
  subscribeToProfile(callback: (profile: Profile) => void): void;

  queryDevices(): Promise<DeviceInfo[]>;
  queryContacts(): ResultSet<Contact>;

  createInvitation(): Promise<InvitationRequest>;
  acceptInvitation(invitation: InvitationWrapper): InvitationChallenge;

  // sign(request: SignRequest): Promise<SignResponse>;
  // addKeyRecord(keyRecord: KeyRecord): Promise<void>;

  // setDevicePreference(key: string, value: string): Promise<void>;
  // getDevicePreference(key: string): Promise<string | undefined>;

  // setGlobalPreference(key: string, value: string): Promise<void>;
  // getGlobalPreference(key: string): Promise<string | undefined>;
}
