//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/keys';

// TODO(burdon): Proxy/service abstraction?
// TODO(burdon): Typed queries/subscriptions.
// TODO(burdon): Common error handling.
// TODO(burdon): ECHO database should not depend on the high-level framework.
// TODO(burdon): Override equals for PublicKey?

//
// Client
//

/**
 * Framework root object for DXOS network peers.
 * - Configurable.
 * - Singleton container and factory (using configuration) for independent subsystems.
 * - Establishes proxy/service linkage.
 */
// TODO(burdon): Create stateless (well-formed) root object (e.g., Profile).
export interface Client {
  get halo (): Halo
  get circle (): Circle
  get brane (): Brane
  get meta (): Meta
  get messenger (): Messenger
}

//
// META
//

export interface Meta {
  createRecord<Type> (record: RecordData<Type>): Promise<Record<Type>>

  // TODO(burdon): GraphQL queries?
  queryRecords (query?: MetaQuery): Result<Record, MetaQuery>
}

export interface MetaQuery {
  get type (): string
}

export interface RecordData<Type> {
  // The type field identifies the fully-qualified protobuf message type.
  get type (): string
  get data (): Type
}

export interface Record<Type = {}> extends RecordData<Type> {
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

  // TODO(burdon): Split out device management?
  get device (): Device
  queryDevices (query?: any): Result<Device>
  createDeviceAdmissionRequest (): DeviceAdmissionRequest
  createDeviceAdmissionChallenge (requestKey: Buffer): DeviceAdmissionChallenge
}

export interface Circle {
  queryContacts (query?: any): Result<Profile>
  queryInvitations (query?: any): Result<InvitationOffer>
}

export interface Profile {
  get identityKey (): PublicKey
  get username (): string
}

export interface Device {
  get deviceKey (): PublicKey
  get name (): string
}

/**
 * Request initiated by new device.
 */
export interface DeviceAdmissionRequest {
  // Serializable discovery key.
  get requestKey (): Buffer

  // Accept and authenticate.
  accept (secret?: string): Promise<void>
}

/**
 * Challenge session instantiated on verifying device.
 */
export interface DeviceAdmissionChallenge {
  get secret (): string

  // Wait for peer to complete.
  wait (): Promise<PublicKey>
}

/**
 * Invitation created by inviter.
 */
export interface Invitation {
  // Serializable discovery key.
  get offerKey (): Buffer

  // Second-factor required for authentication.
  get secret (): string

  // Wait for peer to complete.
  wait (): Promise<void>
}

/**
 * Invitation offer instantiated by invitee.
 */
export interface InvitationOffer {
  // Accept and authenticate.
  accept (secret?: string): Promise<PublicKey>
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

  // TODO(burdon): Move to Circle? Or move queryInvitations to Brane (for symmetry)?
  createInvitationOffer (offerKey: Buffer): InvitationOffer
}

export interface Space {
  get publicKey (): PublicKey
  get database (): Database
  queryMembers (query?: any): Result<Member>

  // TODO(burdon): Move to Circle? Or move queryInvitations to Brane (for symmetry)?
  createInvitation (role: Role, identityKey?: PublicKey): Invitation
}

// TODO(burdon): Are admins also members and readers?
export enum Role {
  ADMIN, MEMBER, READER
}

export interface Member {
  get profile (): Profile
  get role (): Role
}

//
// Database
//

// TODO(burdon): Typed queries and items out-of-scope for this level (Database may be pluggable within a Space).
export interface Database {
  createItem (data: any): Promise<Item>
  queryItems (query?: any): Result<Item>
}

export interface Item {
  get id (): PublicKey
  get spaceKey (): PublicKey // TODO(burdon): Id or key?
}

//
// Generic
//

export type ResultCallback<Element, Query> = (elements: Element[], subscription: Subscription<Element, Query>) => void

/**
 * Generic async query and response.
 */
export interface Result<Element, Query = {}> {
  get query (): Query

  // Cached results are immediately available.
  get elements (): Element[]

  // Subscribe to changes.
  onUpdate (cb: ResultCallback<Element, Query>): Subscription<Element, Query>
}

export interface Subscription<Element, Query> {
  get query (): Query
  get result (): Result<Element, Query>
  cancel (): void
}
