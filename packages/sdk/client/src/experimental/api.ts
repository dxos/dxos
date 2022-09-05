//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

// TODO(burdon): Typed queries/subscriptions.
// TODO(burdon): Common error handling.
// TODO(burdon): ECHO database should not depend on the high-level framework.

//
// Client
//

/**
 * Root object.
 * - Configurable.
 * - Container for major independent subsystems.
 * - Establishes proxy/service linkage.
 */
export interface Client {
  get halo (): Halo
  get circle () : Circle
  get brane (): Brane
  get meta (): Meta
  get messenger (): Messenger
}

//
// META
//

export interface Meta {
  queryRecords (query?: any): Result<Record>
}

export interface Record {
  get publicKey (): PublicKey
}

//
// MESH
//

export interface Messenger {
  send (key: PublicKey, message: any): Promise<Receipt>
}

export interface Receipt {
  get recipient (): PublicKey
}

//
// HALO
//

export interface Halo {
  get profile (): Profile
  createProfile (): Promise<Buffer>
  recoverProfile (privateKey: Buffer): Promise<Profile>
  queryDevices (query?: any): Result<Device>
}

export interface Circle {
  queryContacts (query?: any): Result<Contact>
  queryInvitations (query?: any): Result<InvitationOffer>
}

export interface Profile {
  get publicKey (): PublicKey
  get username (): string
}

export interface Device {
  get publicKey (): PublicKey
  get name (): string
}

export interface Contact {
  get publicKey (): PublicKey
  get profile (): Profile
}

export interface Invitation {
  // Wait for peer to complete.
  wait (): Promise<void>
}

export interface InvitationOffer {
  // Accept and authenticate.
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
  get database (): Database
  queryMembers (query?: any): Result<Member>
  // TODO(burdon): Move to Circle? Or move queryInvitations to Brane (for symmetry)?
  createInvitation (key: PublicKey, role: Role): Invitation
}

// TODO(burdon): Are admins also members and readers?
export enum Role {
  ADMIN, MEMBER, READER
}

export interface Member {
  get profile (): Profile
  get role (): Role
}

export interface Database {
  createItem (data: any): Promise<Item>
  queryItems (query?: any): Result<Item>
}

export interface Item {
  get publicKey (): PublicKey
}

//
// Generic
//

/**
 * Generic async query and response.
 */
export interface Result<Element, Query = {}> {
  get query (): Query

  // Cached results are immediately available.
  get elements (): Element[]

  // Subscribe to changes.
  onUpdate (cb: (elements: Element[]) => void): Subscription
}

export interface Subscription {
  cancel (): void
}
