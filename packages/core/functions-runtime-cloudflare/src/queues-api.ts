//
// Copyright 2025 DXOS.org
//

import { type AnyEntity } from '@dxos/echo/internal';
import type { DXN, SpaceId } from '@dxos/keys';

import type { ServiceContainer } from './internal';

export interface QueryResult {
  objects: AnyEntity[];
  nextCursor: string | null;
  prevCursor: string | null;
}

// TODO(dmaretskyi): Temporary API to get the queues working.
// TODO(dmaretskyi): To be replaced with integrating queues into echo.
/**
 * @deprecated
 */
export interface QueuesAPI {
  queryQueue(queue: DXN, options?: {}): Promise<QueryResult>;
  insertIntoQueue(queue: DXN, objects: AnyEntity[]): Promise<void>;
}

/**
 * @deprecated
 */
export class QueuesAPIImpl implements QueuesAPI {
  constructor(
    private readonly _serviceContainer: ServiceContainer,
    private readonly _spaceId: SpaceId,
  ) {}

  async queryQueue(queue: DXN, options?: {}): Promise<QueryResult> {
    const result = await this._serviceContainer.queryQueue(queue);
    return {
      objects: (result.objects ?? []).map((encoded) => JSON.parse(encoded) as AnyEntity),
      nextCursor: result.nextCursor ?? null,
      prevCursor: result.prevCursor ?? null,
    };
  }

  insertIntoQueue(queue: DXN, objects: AnyEntity[]): Promise<void> {
    // TODO(dmaretskyi): Ugly.
    return this._serviceContainer.insertIntoQueue(queue, JSON.parse(JSON.stringify(objects)));
  }
}
