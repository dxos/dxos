//
// Copyright 2025 DXOS.org
//

import type { HasId } from '@dxos/echo/internal';
import type { DXN, SpaceId } from '@dxos/keys';
import type { QueryResult } from '@dxos/protocols';

import type { ServiceContainer } from './internal/service-container';

// TODO(dmaretskyi): Temporary API to get the queues working.
// TODO(dmaretskyi): To be replaced with integrating queues into echo.
/**
 * @deprecated
 */
export interface QueuesAPI {
  queryQueue(queue: DXN, options?: {}): Promise<QueryResult>;
  insertIntoQueue(queue: DXN, objects: HasId[]): Promise<void>;
}

/**
 * @deprecated
 */
export class QueuesAPIImpl implements QueuesAPI {
  constructor(
    private readonly _serviceContainer: ServiceContainer,
    private readonly _spaceId: SpaceId,
  ) {}

  queryQueue(queue: DXN, options?: {}): Promise<QueryResult> {
    return this._serviceContainer.queryQueue(queue);
  }

  insertIntoQueue(queue: DXN, objects: HasId[]): Promise<void> {
    // TODO(dmaretskyi): Ugly.
    return this._serviceContainer.insertIntoQueue(queue, JSON.parse(JSON.stringify(objects)));
  }
}
