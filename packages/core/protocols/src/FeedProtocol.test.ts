//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SpaceId } from '@dxos/keys';

import { EdgeService } from './edge/edge';
import { decodeServiceId, encodeServiceId } from './FeedProtocol';

describe('queue replicator service id', () => {
  test('encodes the space id ahead of the namespace', ({ expect }) => {
    const spaceId = SpaceId.random();

    expect(encodeServiceId('data', spaceId)).toEqual(`${EdgeService.QUEUE_REPLICATOR}:${spaceId}:data`);
  });

  test('round-trips what it encodes', ({ expect }) => {
    const spaceId = SpaceId.random();

    expect(decodeServiceId(encodeServiceId('trace', spaceId))).toEqual({ namespace: 'trace', spaceId });
  });

  test('decodes the legacy namespace-first ordering', ({ expect }) => {
    // Clients on the old encoding stay in the field until Composer production has rolled over.
    const spaceId = SpaceId.random();

    expect(decodeServiceId(`${EdgeService.QUEUE_REPLICATOR}:data:${spaceId}`)).toEqual({
      namespace: 'data',
      spaceId,
    });
  });

  test('rejects a service id naming no space', ({ expect }) => {
    expect(() => decodeServiceId(`${EdgeService.QUEUE_REPLICATOR}:data:not-a-space-id`)).toThrow();
  });

  test('rejects another service', ({ expect }) => {
    const spaceId = SpaceId.random();

    expect(() => decodeServiceId(`${EdgeService.SUBDUCTION_REPLICATOR}:${spaceId}:data`)).toThrow();
  });
});
