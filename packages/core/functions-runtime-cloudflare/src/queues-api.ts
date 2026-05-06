//
// Copyright 2025 DXOS.org
//

import { type AnyEntity } from '@dxos/echo/internal';
import type { DXN, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import type { ServiceContainer } from './internal';

export interface QueuesQueryResult {
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
  queryQueue(queue: DXN, options?: {}): Promise<QueuesQueryResult>;
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

  async queryQueue(queue: DXN, options?: {}): Promise<QueuesQueryResult> {
    const result = await this._serviceContainer.queryQueue(queue);
    const objects = (result.objects ?? []).flatMap((encoded): AnyEntity[] => {
      try {
        return [JSON.parse(encoded) as AnyEntity];
      } catch (err) {
        log.verbose('queue object JSON parse failed; object ignored', { encoded, error: err });
        return [];
      }
    });
    return {
      objects,
      nextCursor: result.nextCursor ?? null,
      prevCursor: result.prevCursor ?? null,
    };
  }

  insertIntoQueue(queue: DXN, objects: AnyEntity[]): Promise<void> {
    // TODO(dmaretskyi): Ugly.
    return this._serviceContainer.insertIntoQueue(queue, JSON.parse(JSON.stringify(objects)));
  }
}
