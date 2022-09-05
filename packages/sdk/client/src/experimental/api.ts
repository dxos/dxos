//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

//
// Client
//

export interface Client {
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

export interface Circle {
  queryDevices (query?: any): Result<Device>
  queryContacts (query?: any): Result<Contact>
  queryInvitations (query?: any): Result<InvitationOffer>
}

export interface Device {
  key: PublicKey
}

export interface Contact {
  key: PublicKey
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
  key: PublicKey
  queryItems (query?: any): Result<Item>
  // TODO(burdon): Move to Circle?
  createInvitation (key: PublicKey): Invitation
}

export interface Item {
  key: PublicKey
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
