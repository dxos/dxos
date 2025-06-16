//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { type BaseEchoObject, EntityKind, TypeAnnotationId, type TypeAnnotation } from '@dxos/echo-schema';
import { type DXN } from '@dxos/keys';

/**
 * Client-side view onto an EDGE queue.
 */
export interface Queue<T extends BaseEchoObject = BaseEchoObject> {
  dxn: DXN;
  isLoading: boolean;
  error: Error | null;
  // TODO(burdon): Make readonly.
  // TODO(burdon): Rename objects.
  items: T[];
  append(objects: T[]): void;
  delete(ids: string[]): void;

  /**
   * Refreshes the queue from the server.
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
