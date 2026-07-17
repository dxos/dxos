//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import { protoMessage, serviceError } from './service-rpc.ts';
import { mutableArray, publicKey } from './service-schemas.ts';

//
// RPC message schemas.
//

export const MembershipPolicy = Schema.Enums({
  INVITE: 0,
  LOCKED: 1,
});
export type MembershipPolicy = Schema.Schema.Type<typeof MembershipPolicy>;

export const CreateSpaceRequest = Schema.Struct({
  tags: Schema.optional(mutableArray(Schema.String)),
  membershipPolicy: MembershipPolicy,
});
export interface CreateSpaceRequest extends Schema.Schema.Type<typeof CreateSpaceRequest> {}

export const SpaceState = Schema.Enums({
  INVALID: 0,
  SPACE_CLOSED: 1,
  SPACE_INACTIVE: 2,
  SPACE_READY: 3,
  SPACE_INITIALIZING: 4,
  SPACE_ERROR: 5,
  SPACE_ACTIVE: 6,
  SPACE_CONTROL_ONLY: 7,
  SPACE_REQUIRES_MIGRATION: 8,
  SPACE_DELETED: 9,
});
export type SpaceState = Schema.Schema.Type<typeof SpaceState>;

export const EdgeReplicationSetting = Schema.Enums({
  DISABLED: 0,
  ENABLED: 1,
});
export type EdgeReplicationSetting = Schema.Schema.Type<typeof EdgeReplicationSetting>;

export const UpdateSpaceRequest = Schema.Struct({
  spaceKey: publicKey,
  /**
   * Allowed values: ACTIVE, INACTIVE.
   */
  state: Schema.optional(SpaceState),
  edgeReplication: Schema.optional(EdgeReplicationSetting),
});
export interface UpdateSpaceRequest extends Schema.Schema.Type<typeof UpdateSpaceRequest> {}

export const PostMessageRequest = Schema.Struct({
  spaceKey: publicKey,
  channel: Schema.String,
  message: protoMessage('google.protobuf.Any'),
});
export interface PostMessageRequest extends Schema.Schema.Type<typeof PostMessageRequest> {}

export const SubscribeMessagesRequest = Schema.Struct({
  spaceKey: publicKey,
  channel: Schema.String,
});
export interface SubscribeMessagesRequest extends Schema.Schema.Type<typeof SubscribeMessagesRequest> {}

export const WriteCredentialsRequest = Schema.Struct({
  spaceKey: publicKey,
  credentials: Schema.optional(mutableArray(protoMessage('dxos.halo.credentials.Credential'))),
});
export interface WriteCredentialsRequest extends Schema.Schema.Type<typeof WriteCredentialsRequest> {}

export const QueryCredentialsRequest = Schema.Struct({
  spaceKey: publicKey,
  noTail: Schema.optional(Schema.Boolean),
});
export interface QueryCredentialsRequest extends Schema.Schema.Type<typeof QueryCredentialsRequest> {}

/**
 * Epoch migration to perform.
 * - INIT_AUTOMERGE: Init empty automerge document as the space root. Disables legacy ECHO snapshot creation.
 * - PRUNE_AUTOMERGE_ROOT_HISTORY: Init new automerge root by clonning the current space root. History is pruned.
 * - FRAGMENT_AUTOMERGE_ROOT: Create a new space root and move objects from the current space root to separate automerge documents and.
 * - REPLACE_AUTOMERGE_ROOT: Replace the current automerge root with a new one specified by the user.
 * - MIGRATE_REFERENCES_TO_DXN: Upgrade references data structure.
 */
export const Migration = Schema.Enums({
  NONE: 0,
  INIT_AUTOMERGE: 1,
  PRUNE_AUTOMERGE_ROOT_HISTORY: 2,
  FRAGMENT_AUTOMERGE_ROOT: 3,
  REPLACE_AUTOMERGE_ROOT: 4,
  MIGRATE_REFERENCES_TO_DXN: 5,
});
export type Migration = Schema.Schema.Type<typeof Migration>;

export const CreateEpochRequest = Schema.Struct({
  spaceKey: publicKey,
  migration: Schema.optional(Migration),
  /**
   * For REPLACE_AUTOMERGE_ROOT migration.
   */
  automergeRootUrl: Schema.optional(Schema.String),
});
export interface CreateEpochRequest extends Schema.Schema.Type<typeof CreateEpochRequest> {}

// `CreateEpochResponse.controlTimeframe` embeds the `Timeframe` proto substitution (a class with a
// `frames()` accessor), which cannot be modeled as an inline Effect struct, so the response stays
// protobuf-encoded (`protoMessage`).

export const SpaceMemberRole = Schema.Enums({
  INVALID: 0,
  ADMIN: 1,
  EDITOR: 2,
  READER: 3,
  OWNER: 4,
  REMOVED: 5,
});
export type SpaceMemberRole = Schema.Schema.Type<typeof SpaceMemberRole>;

export const UpdateMemberRoleRequest = Schema.Struct({
  spaceKey: publicKey,
  memberKey: publicKey,
  newRole: SpaceMemberRole,
});
export interface UpdateMemberRoleRequest extends Schema.Schema.Type<typeof UpdateMemberRoleRequest> {}

export const AdmitContactRequest = Schema.Struct({
  contact: protoMessage('dxos.client.services.Contact'),
  role: SpaceMemberRole,
  spaceKey: publicKey,
});
export interface AdmitContactRequest extends Schema.Schema.Type<typeof AdmitContactRequest> {}

export const JoinBySpaceKeyRequest = Schema.Struct({
  spaceKey: publicKey,
});
export interface JoinBySpaceKeyRequest extends Schema.Schema.Type<typeof JoinBySpaceKeyRequest> {}

/**
 * Archive encoding format.
 * - BINARY: Tar-based binary archive (default).
 * - JSON: JSON encoding of {@link dxos.echo.db.SerializedSpace}.
 */
export const SpaceArchiveFormat = Schema.Enums({
  BINARY: 0,
  JSON: 1,
});
export type SpaceArchiveFormat = Schema.Schema.Type<typeof SpaceArchiveFormat>;

export const SpaceArchive = Schema.Struct({
  filename: Schema.String,
  contents: Schema.Uint8Array,
  format: Schema.optional(SpaceArchiveFormat),
});
export interface SpaceArchive extends Schema.Schema.Type<typeof SpaceArchive> {}

export const ExportSpaceRequest = Schema.Struct({
  spaceId: Schema.String,
  /**
   * Archive format to produce. Defaults to BINARY.
   */
  format: Schema.optional(SpaceArchiveFormat),
});
export interface ExportSpaceRequest extends Schema.Schema.Type<typeof ExportSpaceRequest> {}

export const ExportSpaceResponse = Schema.Struct({
  archive: SpaceArchive,
});
export interface ExportSpaceResponse extends Schema.Schema.Type<typeof ExportSpaceResponse> {}

export const ImportSpaceRequest = Schema.Struct({
  archive: SpaceArchive,
  /**
   * Immutable tags to set on the imported space at creation time.
   */
  tags: Schema.optional(mutableArray(Schema.String)),
});
export interface ImportSpaceRequest extends Schema.Schema.Type<typeof ImportSpaceRequest> {}

export const ImportSpaceResponse = Schema.Struct({
  /**
   * The ID of the new space.
   */
  newSpaceId: Schema.String,
});
export interface ImportSpaceResponse extends Schema.Schema.Type<typeof ImportSpaceResponse> {}

/**
 * Effect RPC definitions for `dxos.client.services.SpacesService`.
 * Service-only payloads use Effect schemas; shared proto types remain protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('createSpace', {
    payload: CreateSpaceRequest,
    success: protoMessage('dxos.client.services.Space'),
    error: serviceError,
  }),
  Rpc.make('updateSpace', {
    payload: UpdateSpaceRequest,
    error: serviceError,
  }),
  Rpc.make('querySpaces', {
    success: protoMessage('dxos.client.services.QuerySpacesResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('updateMemberRole', {
    payload: UpdateMemberRoleRequest,
    error: serviceError,
  }),
  Rpc.make('admitContact', {
    payload: AdmitContactRequest,
    error: serviceError,
  }),
  Rpc.make('joinBySpaceKey', {
    payload: JoinBySpaceKeyRequest,
    success: protoMessage('dxos.client.services.JoinSpaceResponse'),
    error: serviceError,
  }),
  /**
   * Broadcast an ephemeral message to the space swarm.
   */
  Rpc.make('postMessage', {
    payload: PostMessageRequest,
    error: serviceError,
  }),
  /**
   * Subscribe to messages from the space swarm.
   */
  Rpc.make('subscribeMessages', {
    payload: SubscribeMessagesRequest,
    success: protoMessage('dxos.mesh.teleport.gossip.GossipMessage'),
    error: serviceError,
    stream: true,
  }),
  /**
   * Write credentials to the space control feed.
   */
  Rpc.make('writeCredentials', {
    payload: WriteCredentialsRequest,
    error: serviceError,
  }),
  /**
   * Query credentials from the space control feed.
   */
  Rpc.make('queryCredentials', {
    payload: QueryCredentialsRequest,
    success: protoMessage('dxos.halo.credentials.Credential'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('createEpoch', {
    payload: CreateEpochRequest,
    success: protoMessage('dxos.client.services.CreateEpochResponse'),
    error: serviceError,
  }),
  Rpc.make('exportSpace', {
    payload: ExportSpaceRequest,
    success: ExportSpaceResponse,
    error: serviceError,
  }),
  Rpc.make('importSpace', {
    payload: ImportSpaceRequest,
    success: ImportSpaceResponse,
    error: serviceError,
  }),
).prefix('SpacesService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
