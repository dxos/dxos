//
// Copyright 2025 DXOS.org
//

import { type Database, type Entity } from '@dxos/echo';
import { type EID, type EntityId } from '@dxos/keys';

/**
 * @deprecated Queues are migrating to feeds (regular ECHO objects).
 *   Pass a literal `'data'` / `'trace'` to APIs that still accept a subspaceTag.
 */
export const QueueSubspaceTags = Object.freeze({
  DATA: 'data',
  TRACE: 'trace',
});

/** @deprecated */
export type QueueSubspaceTag = (typeof QueueSubspaceTags)[keyof typeof QueueSubspaceTags];

/**
 * @deprecated Migrate to Feed
 * Client-side view onto an EDGE queue.
 */
// TODO(dmaretskyi): Remove type parameter -- all queues are untyped, and we use query to enforce type.
export interface Queue<T extends Entity.Unknown = Entity.Unknown> extends Database.Queryable {
  readonly uri: EID.EID;

  /**
   * Subscribe to queue updates.
   * @returns Unsubscribe function.
   */
  subscribe(callback: () => void): () => void;

  /**
   * @deprecated Use query() API instead.
   */
  readonly isLoading: boolean;

  /**
   * @deprecated Use query() API instead.
   */
  readonly error: Error | null;

  /**
   * @deprecated Use query() API instead.
   */
  // TODO(dmaretskyi): Replace with unified query(query) => QueryResult<T> API.
  readonly objects: T[];

  /**
   * Appends objects to the queue.
   */
  append(objects: T[]): Promise<void>;

  /**
   * Deletes objects from the queue.
   */
  delete(ids: string[]): Promise<void>;

  /**
   * Syncs the queue with the server.
   * @param shouldPush - Whether to push local changes to the server. Defaults to true.
   * @param shouldPull - Whether to pull remote changes from the server. Defaults to true.
   */
  sync(request?: { shouldPush?: boolean; shouldPull?: boolean }): Promise<void>;

  /**
   * Query all objects in the queue.
   * @deprecated Use query() API instead.
   */
  // TODO(dmaretskyi): Replace with unified query(query) => QueryResult<T> API.
  queryObjects(): Promise<T[]>;

  /**
   * Queries objects by id.
   * @deprecated Use query() API instead.
   */
  // TODO(dmaretskyi): Replace with unified query(query) => QueryResult<T> API.
  getObjectsById(ids: EntityId[]): Promise<(T | undefined)[]>;

  /**
   * Refreshes the queue from the server.
   * @deprecated Use query() API instead.
   */
  // TODO(dmaretskyi): Remove.
  refresh(): Promise<void>;
}
