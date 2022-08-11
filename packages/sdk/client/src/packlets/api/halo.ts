//
// Copyright 2022 DXOS.org
//

import { DeviceInfo, KeyRecord } from '@dxos/credentials';
import { Contact, CreateProfileOptions, InvitationDescriptor, ResultSet } from '@dxos/echo-db';
import { PublicKey } from '@dxos/protocols';

import { Profile, SignRequest, SignResponse } from '../proto';
import { Invitation, InvitationRequest } from './invitations';

/**
 * Signer plugin.
 */
export interface HaloSigner {
  sign: (request: SignRequest, key: KeyRecord) => Promise<SignResponse>
}

/**
 * HALO API.
 */
// TODO(burdon): Separate public API form implementation (move comments here).
export interface Halo {
  info: { key?: PublicKey }

  get profile (): Profile | undefined
  createProfile (options?: CreateProfileOptions): Promise<Profile>
  recoverProfile (seedPhrase: string): Promise<Profile>

  sign (request: SignRequest): Promise<SignResponse>
  addKeyRecord (keyRecord: KeyRecord): Promise<void>

  /**
   * @deprecated
   */
  subscribeToProfile (callback: (profile: Profile) => void): void

  queryContacts (): ResultSet<Contact>
  createInvitation (): Promise<InvitationRequest>
  acceptInvitation (invitationDescriptor: InvitationDescriptor): Invitation

  queryDevices (): Promise<DeviceInfo[]>
  setDevicePreference (key: string, value: string): Promise<void>
  getDevicePreference (key: string): Promise<string | undefined>

  setGlobalPreference (key: string, value: string): Promise<void>
  getGlobalPreference (key: string): Promise<string | undefined>
}
