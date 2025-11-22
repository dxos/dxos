//
// Copyright 2021 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type MulticastObservable } from '@dxos/async';
import { type SpecificCredential } from '@dxos/credentials';
import { type Obj } from '@dxos/echo';
import { type EchoDatabase, type QueueFactory, type SpaceSyncState } from '@dxos/echo-db';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { type Messenger } from '@dxos/protocols';
import {
  type Contact,
  type CreateEpochRequest,
  type Invitation,
  type SpaceArchive,
  type Space as SpaceData,
  type SpaceMember,
  type SpaceState,
  type UpdateMemberRoleRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { type EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { type SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { type Credential, type Epoch } from '@dxos/protocols/proto/dxos/halo/credentials';

import { type CancellableInvitation } from './invitations';

export type CreateEpochOptions = {
  migration?: CreateEpochRequest.Migration;
  automergeRootUrl?: string;
};

export interface SpaceInternal {
  get data(): SpaceData;

  getCredentials(): Promise<Credential[]>;

  getEpochs(): Promise<SpecificCredential<Epoch>[]>;

  // TODO(dmaretskyi): Return epoch info.
  createEpoch(options?: CreateEpochOptions): Promise<void>;

  // TOOD(burdon): Start to factor out credentials.
  removeMember(memberKey: PublicKey): Promise<void>;

  export(): Promise<SpaceArchive>;

  /**
   * Migrate space data to the latest version.
   */
  migrate(): Promise<void>;

  setEdgeReplicationPreference(setting: EdgeReplicationSetting): Promise<void>;

  /**
   * Waits until the space is fully synced with EDGE.
   * @throws If the EDGE sync is disabled.
   */
  syncToEdge(opts?: {
    onProgress: (state: SpaceSyncState.PeerState | undefined) => void;
    timeout?: number;
  }): Promise<void>;
}

export const SPACE_TAG = Symbol('dxos.client.protocol.Space');

export interface Space extends Messenger {
  readonly [SPACE_TAG]: true;

  /**
   * @deprecated Use `id`.
   */
  get key(): PublicKey;

  /**
   * Unique space identifier.
   */
  get id(): SpaceId;

  /**
   * Echo database.
   */
  get db(): EchoDatabase;

  /**
   * Access to queues.
   */
  get queues(): QueueFactory;

  // TODO(burdon): Replace with state?
  get isOpen(): boolean;

  /**
   * Current state of the space.
   * The database is ready to be used in `SpaceState.SPACE_READY` state.
   * Presence is available in `SpaceState.SPACE_CONTROL_ONLY` state.
   */
  get state(): MulticastObservable<SpaceState>;

  /**
   * Properties object.
   */
  get properties(): Obj.Any;

  /**
   * Current state of space pipeline.
   */
  get pipeline(): MulticastObservable<SpaceData.PipelineState>;

  get invitations(): MulticastObservable<CancellableInvitation[]>;

  get members(): MulticastObservable<SpaceMember[]>;

  /**
   * @deprecated
   */
  // TODO(wittjosiah): Remove. This should not be exposed.
  get internal(): SpaceInternal;

  /**
   * Activates the space enabling the use of the database and starts replication with peers.
   * The setting is persisted on the local device.
   */
  // TODO(wittjosiah): Rename activate/deactivate?
  open(): Promise<void>;

  /**
   * Deactivates the space stopping replication with other peers.
   * The space will not auto-open on the next app launch.
   * The setting is persisted on the local device.
   */
  close(): Promise<void>;

  /**
   * Waits until the space is in the ready state, with database initialized.
   */
  waitUntilReady(): Promise<this>;

  createSnapshot(): Promise<SpaceSnapshot>;

  // TODO(burdon): Create invitation?
  // TODO(burdon): Factor out membership, etc.
  share(options?: Partial<Invitation>): CancellableInvitation;
  admitContact(contact: Contact): Promise<void>;
  updateMemberRole(request: Omit<UpdateMemberRoleRequest, 'spaceKey'>): Promise<void>;
}

export const isSpace = (object: unknown): object is Space =>
  typeof object === 'object' && object != null && (object as Space)[SPACE_TAG] === true;

// TODO(burdon): Create lower-level definition (HasId, db, etc.) and move to @dxos/echo.
export const SpaceSchema: Schema.Schema<Space> = Schema.Any.pipe(
  Schema.filter((space) => isSpace(space)),
  Schema.annotations({ title: 'Space' }),
);
