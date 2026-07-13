//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Feed, Obj, Relation } from '@dxos/echo';
import { Expando } from '@dxos/schema';

import * as DerivedBinding from './DerivedBinding';

describe('DerivedBinding', () => {
  test('make produces a relation with a materialized cursor', ({ expect }) => {
    const feed = Feed.make();
    const target = Obj.make(Expando.Expando, { name: 'target' });

    const binding = DerivedBinding.make({ [Relation.Source]: feed, [Relation.Target]: target });

    expect(DerivedBinding.instanceOf(binding)).toBe(true);
    expect(binding.cursor).toBeDefined();
    expect(Relation.getSource(binding).id).toBe(feed.id);
    expect(Relation.getTarget(binding).id).toBe(target.id);
  });
});
