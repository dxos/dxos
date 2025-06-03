//
// Copyright 2025 DXOS.org
//

import { BaseEchoObject, EntityKind, TypeAnnotationId, type TypeAnnotation } from '@dxos/echo-schema';
import { type DXN } from '@dxos/keys';
import { Schema } from 'effect';

/**
 * Client-side view onto an EDGE queue.
 */
export type Queue<T extends BaseEchoObject = BaseEchoObject> = {
  dxn: DXN;
  items: T[]; // TODO(burdon): Make readonly.
  isLoading: boolean;
  error: Error | null;
  append(items: T[]): void;
  delete(ids: string[]): void;

  /**
   * Refreshes the queue from the server.
   */
  // TODO(dmaretskyi): Remove.
  refresh(): Promise<void>;
};

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
