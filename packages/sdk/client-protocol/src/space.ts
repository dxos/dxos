//
// Copyright 2021 DXOS.org
//

import { type MulticastObservable, type CleanupFn } from '@dxos/async';
import { type SpecificCredential } from '@dxos/credentials';
import { type QueueFactory, type EchoDatabase, type AnyLiveObject } from '@dxos/echo-db';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import {
  type Contact,
  type CreateEpochRequest,
  type Invitation,
  type Space as SpaceData,
  type SpaceArchive,
  type SpaceMember,
  type SpaceState,
  type UpdateMemberRoleRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { type EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { type SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { type Credential, type Epoch } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';

import { type CancellableInvitation } from './invitations';

export type CreateEpochOptions = {
  migration?: CreateEpochRequest.Migration;
  automergeRootUrl?: string;
};

export interface SpaceInternal {
  get data(): SpaceData;

  // TODO(dmaretskyi): Return epoch info.
  createEpoch(options?: CreateEpochOptions): Promise<void>;

  getCredentials(): Promise<Credential[]>;

  getEpochs(): Promise<SpecificCredential<Epoch>[]>;

  removeMember(memberKey: PublicKey): Promise<void>;

  /**
   * Migrate space data to the latest version.
   */
  migrate(): Promise<void>;

  setEdgeReplicationPreference(setting: EdgeReplicationSetting): Promise<void>;

  export(): Promise<SpaceArchive>;
}

// TODO(burdon): Separate public API form implementation (move comments here).
export interface Space {
  /**
   * Unique space identifier.
   */
  get id(): SpaceId;

  /**
   * @deprecated Use `id`.
   */
  get key(): PublicKey;

  /**
   * Echo database.
   */
  get db(): EchoDatabase;

  /**
   * Access to queues.
   */
  get queues(): QueueFactory;

  get isOpen(): boolean;

  /**
   * Properties object.
   */
  get properties(): AnyLiveObject<any>;

  /**
   * Current state of the space.
   * The database is ready to be used in `SpaceState.SPACE_READY` state.
   * Presence is available in `SpaceState.SPACE_CONTROL_ONLY` state.
   */
  get state(): MulticastObservable<SpaceState>;

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

  // TODO(wittjosiah): Rename activate/deactivate?
  /**
   * Activates the space enabling the use of the database and starts replication with peers.
   * The setting is persisted on the local device.
   */
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
  share(options?: Partial<Invitation>): CancellableInvitation;

  admitContact(contact: Contact): Promise<void>;

  updateMemberRole(request: Omit<UpdateMemberRoleRequest, 'spaceKey'>): Promise<void>;

  // TODO(wittjosiah): Gather into messaging abstraction?
  postMessage: (channel: string, message: any) => Promise<void>;
  listen: (channel: string, callback: (message: GossipMessage) => void) => CleanupFn;
}
