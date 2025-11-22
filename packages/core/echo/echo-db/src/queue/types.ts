//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database, type Obj, type Relation } from '@dxos/echo';
import { EntityKind, type TypeAnnotation, TypeAnnotationId } from '@dxos/echo/internal';
import { type DXN, type ObjectId } from '@dxos/keys';

// TODO(dmaretskyi): Move the interface into @dxos/echo package.

/**
 * Client-side view onto an EDGE queue.
 */
export interface Queue<T extends Obj.Any | Relation.Any = Obj.Any | Relation.Any> extends Database.Queryable {
  readonly dxn: DXN;

  toJSON(): any;

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
