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
  queryDevices (query?: any): Subscription<Device>
  queryContacts (query?: any): Subscription<Contact>
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

//
// ECHO
//

export interface Brane {
  querySpaces (query?: any): Subscription<Space>
  queryItems (query?: any): Subscription<Item>
  createSpace (): Promise<Space>
}

export interface Space {
  key: PublicKey
  query (query?: any): Subscription<Item>
  createInvitation (key: PublicKey): Invitation
}

export interface Item {
  key: PublicKey
}

//
// Generic
//

export interface Subscription<T> {
  get elements (): T[]
}
