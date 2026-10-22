//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import { EntityId, SpaceId, URI } from '@dxos/keys';

import { SpaceGraphModel } from './space-graph.ts';

describe('SpaceGraphModel', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('a stored ref with a malformed echo URI drops only its own edge', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const target = db.add(Obj.make(TestSchema.Expando, { title: 'target' }));
    const malformed = URI.make(`echo://${SpaceId.random()}/${EntityId.random()}/${EntityId.random()}`);
    const source = db.add(
      Obj.make(TestSchema.Expando, { title: 'source', good: Ref.make(target), bad: Ref.fromURI(malformed) }),
    );
    await db.flush();

    const graph = await new SpaceGraphModel().open(db);
    try {
      await expect
        .poll(() => graph.edges.filter((edge) => edge.type === 'ref').map((edge) => [edge.source, edge.target]))
        .toEqual([[source.id, target.id]]);
    } finally {
      await graph.close();
    }
  });
});
