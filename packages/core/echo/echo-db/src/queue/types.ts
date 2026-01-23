//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Database, type Entity } from '@dxos/echo';
import { EntityKind, type TypeAnnotation, TypeAnnotationId } from '@dxos/echo/internal';
import { type DXN, type ObjectId } from '@dxos/keys';

/**
 * Client-side view onto an EDGE queue.
 */
// TODO(dmaretskyi): Move the interface into @dxos/echo package.
// TODO(dmaretskyi): Remove type parameter -- all queues are untyped, and we use query to enforce type.
export interface Queue<T extends Entity.Unknown = Entity.Unknown> extends Database.Queryable {
  readonly dxn: DXN;

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
  getObjectsById(ids: ObjectId[]): Promise<(T | undefined)[]>;

  /**
   * Refreshes the queue from the server.
   * @deprecated Use query() API instead.
   */
  // TODO(dmaretskyi): Remove.
  refresh(): Promise<void>;
}

// TODO(dmaretskyi): Implement.
const isQueue = (value: unknown): value is Queue => {
  return false;
};

export const Queue: Schema.Schema<Queue> = Schema.declare(isQueue, {
  [TypeAnnotationId]: {
    // TODO(dmaretskyi): Perhaps queue should be its own entity kind.
    kind: EntityKind.Object,
    typename: 'dxos.org/type/Queue',
    version: '0.1.0',
  } satisfies TypeAnnotation,
});
