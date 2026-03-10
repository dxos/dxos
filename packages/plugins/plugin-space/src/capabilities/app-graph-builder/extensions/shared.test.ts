//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Query, Ref, Type, View } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { ViewAnnotation } from '@dxos/schema';

import { buildViewIndex } from './shared';

const TestContact = Schema.Struct({
  name: Schema.String,
}).pipe(
  Type.object({
    typename: 'test/Contact',
    version: '0.1.0',
  }),
);

const TestViewWrapper = Schema.Struct({
  name: Schema.optional(Schema.String),
  view: Ref.Ref(View.View),
}).pipe(
  Type.object({
    typename: 'test/ViewWrapper',
    version: '0.1.0',
  }),
  ViewAnnotation.set(true),
);

describe('buildViewIndex', () => {
  let testBuilder: EchoTestBuilder;
  let db: EchoDatabase;
  let registry: Registry.Registry;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    const result = await testBuilder.createDatabase({ types: [TestContact, TestViewWrapper, View.View] });
    db = result.db;
    registry = Registry.make();
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('includes typename when a straightforward view targets it', async ({ expect }) => {
    const viewObj = db.add(
      View.make({
        query: { ast: Query.select(Filter.type(TestContact)).ast },
      }),
    );
    db.add(Obj.make(TestViewWrapper, { view: Ref.make(viewObj) }));
    await db.flush({ indexes: true });

    const allSchemas = db.schemaRegistry.query({ location: ['runtime'] }).runSync();
    const viewIndex = buildViewIndex(registry.get.bind(registry) as any, { db } as any, allSchemas);

    expect(viewIndex.typenamesWithViews.has(Type.getTypename(TestContact))).toBe(true);
  });

  test('excludes typename when no straightforward view targets it', async ({ expect }) => {
    const viewObj = db.add(
      View.make({
        query: { ast: Query.select(Filter.nothing()).ast },
      }),
    );
    db.add(Obj.make(TestViewWrapper, { view: Ref.make(viewObj) }));
    await db.flush({ indexes: true });

    const allSchemas = db.schemaRegistry.query({ location: ['runtime'] }).runSync();
    const viewIndex = buildViewIndex(registry.get.bind(registry) as any, { db } as any, allSchemas);

    expect(viewIndex.typenamesWithViews.has(Type.getTypename(TestContact))).toBe(false);
    expect(viewIndex.typenamesWithViews.size).toBe(0);
  });

  test('getViewsForTypename returns matching view objects', async ({ expect }) => {
    const viewObj = db.add(
      View.make({
        query: { ast: Query.select(Filter.type(TestContact)).ast },
      }),
    );
    const tableView = db.add(Obj.make(TestViewWrapper, { view: Ref.make(viewObj) }));
    await db.flush({ indexes: true });

    const allSchemas = db.schemaRegistry.query({ location: ['runtime'] }).runSync();
    const viewIndex = buildViewIndex(registry.get.bind(registry) as any, { db } as any, allSchemas);

    const views = viewIndex.getViewsForTypename(Type.getTypename(TestContact));
    expect(views).toHaveLength(1);
    expect(views[0].id).toBe(tableView.id);
  });

  test('returns empty index when no view schemas exist', async ({ expect }) => {
    await db.flush({ indexes: true });

    const userSchemas = db.schemaRegistry
      .query({ location: ['runtime'] })
      .runSync()
      .filter((schema) => !ViewAnnotation.get(schema).pipe((opt) => opt._tag === 'Some' && opt.value));
    const viewIndex = buildViewIndex(registry.get.bind(registry) as any, { db } as any, userSchemas);

    expect(viewIndex.typenamesWithViews.size).toBe(0);
    expect(viewIndex.getViewsForTypename(Type.getTypename(TestContact))).toHaveLength(0);
  });
});
