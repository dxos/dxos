//
// Copyright 2021 DXOS.org
//

import { type MulticastObservable, type UnsubscribeCallback } from '@dxos/async';
import { type EchoDatabase, type EchoReactiveObject } from '@dxos/echo-schema';
import { type PublicKey } from '@dxos/keys';
import {
  type Invitation,
  type Space as SpaceData,
  type SpaceMember,
  type SpaceState,
} from '@dxos/protocols/proto/dxos/client/services';
import { type SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';

import { type CancellableInvitation } from './invitations';

export interface SpaceInternal {
  get data(): SpaceData;

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

  // TODO(dmaretskyi): Return epoch info.
  createEpoch(): Promise<void>;

  removeMember(memberKey: PublicKey): Promise<void>;
}

// TODO(burdon): Separate public API form implementation (move comments here).
export interface Space {
  get key(): PublicKey;

  /**
   * Echo database.
   */
  get db(): EchoDatabase;
  get isOpen(): boolean;

  /**
   * Properties object.
   */
  get properties(): EchoReactiveObject<any>;

  /**
   * Current state of the space.
   * The database is ready to be used in `SpaceState.READY` state.
   * Presence is available in `SpaceState.CONTROL_ONLY` state.
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

  open(): Promise<void>;
  close(): Promise<void>;

  /**
   * Waits until the space is in the ready state, with database initialized.
   */
  waitUntilReady(): Promise<this>;

  // TODO(wittjosiah): Gather into messaging abstraction?
  postMessage: (channel: string, message: any) => Promise<void>;

  listen: (channel: string, callback: (message: GossipMessage) => void) => UnsubscribeCallback;

  share(options?: Partial<Invitation>): CancellableInvitation;

  createSnapshot(): Promise<SpaceSnapshot>;
}
