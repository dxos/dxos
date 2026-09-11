//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { EncodedReference, type EntityStructure } from '@dxos/echo-protocol';
import { EID, EntityId, SpaceId } from '@dxos/keys';

import { DeletionResolver } from './deletion.ts';

describe('DeletionResolver', () => {
  test('a chain past the depth bound does not poison verdicts within it', () => {
    const spaceId = SpaceId.random();
    const resolver = new DeletionResolver(spaceId);

    const rootId = EntityId.random();
    const chain = Array.from({ length: 12 }, () => EntityId.random());
    const objects: Record<string, EntityStructure> = {
      [rootId]: { system: { deleted: true }, meta: { keys: [] }, data: {} },
    };
    chain.forEach((objectId, index) => {
      const parentId = index === 0 ? rootId : chain[index - 1];
      objects[objectId] = {
        system: { parent: EncodedReference.fromURI(EID.make({ spaceId, entityId: parentId })) },
        meta: { keys: [] },
        data: {},
      };
    });
    resolver.add(objects);

    // Asked first so its truncated walk populates the memo for everything above it.
    expect(resolver.isDeleted(chain[11])).toBe(false);
    // Five hops from the deleted root, so well inside the bound.
    expect(resolver.isDeleted(chain[4])).toBe(true);
    expect(resolver.isDeleted(rootId)).toBe(true);
  });
});
