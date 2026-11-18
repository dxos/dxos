//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SpaceId } from '@dxos/keys';

import * as FactFeed from './FactFeed.ts';
import type * as RdfStore from './RdfStore.ts';

describe('FactFeed', () => {
  test('every replica derives the same feed id for a space, and another space gets its own', ({ expect }) => {
    const spaceId = SpaceId.random();
    expect(FactFeed.feedId(spaceId)).toBe(FactFeed.feedId(spaceId));
    expect(FactFeed.feedId(spaceId)).not.toBe(FactFeed.feedId(SpaceId.random()));
  });

  test('a batch survives a block round trip', ({ expect }) => {
    const batch: RdfStore.Batch = {
      id: 'b1',
      writes: [
        {
          _tag: 'insert',
          quads: [
            {
              s: { termType: 'NamedNode', value: 'https://example.com/dima' },
              p: { termType: 'NamedNode', value: 'https://example.com/name' },
              o: { termType: 'Literal', value: 'Dima', language: 'en' },
              g: { termType: 'NamedNode', value: 'https://example.com/g1' },
            },
          ],
        },
        { _tag: 'delete', quads: [] },
        { _tag: 'clear' },
      ],
    };
    expect(FactFeed.decodeBlock(FactFeed.encodeBlock(batch))).toEqual(batch);
  });
});
