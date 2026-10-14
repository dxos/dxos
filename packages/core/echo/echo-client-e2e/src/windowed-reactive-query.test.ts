//
// Copyright 2026 DXOS.org
//

import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { type Database, Filter, Obj, Query } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import { range } from '@dxos/util';

// Windowed queries are served only by the index (the working set declines them), so a reactive
// subscription that the index never answers stays empty with nothing else to mask it.
describe('windowed reactive query', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const variants: Record<string, (db: Database.Database) => Query.Any> = {
    plain: () => Query.select(Filter.everything()).limit(10),
    from: (db) => Query.select(Filter.everything()).limit(10).from(db),
    deleted: () => Query.select(Filter.everything()).limit(10).options({ deleted: 'include' }),
    deletedFrom: (db) => Query.select(Filter.everything()).limit(10).options({ deleted: 'include' }).from(db),
  };

  test.each(Object.keys(variants))('atom answers a limit query (%s)', async (variant) => {
    const { db } = await builder.createDatabase();
    range(50).forEach((index) => db.add(Obj.make(TestSchema.Expando, { index })));
    await db.flush({ indexes: true });

    const result = db.query(variants[variant](db));
    const registry = AtomRegistry.make();
    let latest: readonly unknown[] = [];
    onTestFinished(
      registry.subscribe(
        result.atom,
        (value) => {
          latest = value;
        },
        { immediate: true },
      ),
    );

    expect(await result.run()).toHaveLength(10);
    await waitForCondition({ condition: () => latest.length === 10, timeout: 5_000 });
  });
});
