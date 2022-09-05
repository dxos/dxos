//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

//
// Client
//

/**
 * Root object.
 * - Configurable.
 * - Container for major independent subsystems.
 * - Establishes proxy/server linkage.
 */
export interface Client {
  get halo (): Halo
  get messenger (): Messenger
  get circle () : Circle
  get brane (): Brane
}

//
// MESH
//

export interface Messenger {
  send (key: PublicKey, message: any): Promise<void>
}

//
// HALO
//

export interface Halo {
  get profile (): Profile
  createProfile (): Promise<Buffer>
  recoverProfile (privateKey: Buffer): Promise<Profile>
}

export interface Circle {
  queryDevices (query?: any): Result<Device>
  queryContacts (query?: any): Result<Contact>
  queryInvitations (query?: any): Result<InvitationOffer>
}

export interface Profile {
  get publicKey (): PublicKey
  get username (): string
}

// TODO(burdon): Device management
export interface Device {
  get publicKey (): PublicKey
  get name (): string
}

export interface Contact {
  get publicKey (): PublicKey
  get profile (): Profile
}

export interface Invitation {
  wait (): Promise<void>
}

export interface InvitationOffer {
  accept (secret?: string): Promise<void>
}

//
// ECHO
//

export interface Brane {
  createSpace (): Promise<Space>
  getSpace (key: PublicKey): Promise<Space>
  querySpaceKeys (query?: any): Result<PublicKey>
  querySpaces (query?: any): Result<Space>
  queryItems (query?: any): Result<Item>
}

export interface Space {
  get publicKey (): PublicKey
  queryItems (query?: any): Result<Item>
  // TODO(burdon): Move to Circle?
  createInvitation (key: PublicKey): Invitation
}

export interface Item {
  get publicKey (): PublicKey
}

//
// Generic
//

export interface Subscription {
  cancel (): void
}

export interface Result<T> {
  // Cached results are immediately available.
  get elements (): T[]

  // Subscribe to changes.
  onUpdate (cb: (elements: T[]) => void): Subscription
}
