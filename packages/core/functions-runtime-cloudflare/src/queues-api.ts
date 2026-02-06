//
// Copyright 2025 DXOS.org
//

import { type AnyEntity } from '@dxos/echo/internal';
import type { DXN, SpaceId } from '@dxos/keys';
import { type QueueProtocol } from '@dxos/protocols';

import type { ServiceContainer } from './internal';

// TODO(dmaretskyi): Temporary API to get the queues working.
// TODO(dmaretskyi): To be replaced with integrating queues into echo.
/**
 * @deprecated
 */
export interface QueuesAPI {
  queryQueue(queue: DXN, options?: {}): Promise<QueueProtocol.QueryResult>;
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

  queryQueue(queue: DXN, options?: {}): Promise<QueueProtocol.QueryResult> {
    return this._serviceContainer.queryQueue(queue);
  }

  insertIntoQueue(queue: DXN, objects: AnyEntity[]): Promise<void> {
    // TODO(dmaretskyi): Ugly.
    return this._serviceContainer.insertIntoQueue(queue, JSON.parse(JSON.stringify(objects)));
  }
}
