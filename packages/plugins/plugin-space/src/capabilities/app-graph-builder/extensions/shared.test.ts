//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { type Space, SpaceState } from '@dxos/client/echo';
import { Annotation, DXN, Entity, Filter, Obj, Query, Ref, Type, View } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { MigrationVersionAnnotation, Migrations } from '@dxos/migrations';
import { ViewAnnotation } from '@dxos/schema';

import { buildViewIndex, checkPendingMigration } from './shared';

const TestContact = Type.makeObject(DXN.make('com.example.type.contact', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
  }),
);

const TestViewWrapper = Type.makeObject(DXN.make('com.example.type.viewWrapper', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    view: Ref.Ref(View.View),
  }).pipe(ViewAnnotation.set(['view'])),
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
    await db.flush();

    const allSchemas = db.graph.registry
      .list()
      .filter(Type.isType)
      .filter((t) => !Type.isTypeKind(t));
    const viewIndex = buildViewIndex(registry.get.bind(registry) as any, { db } as any, allSchemas);

    expect(viewIndex.typeUrisWithViews.has(Type.getURI(TestContact))).toBe(true);
  });

  test('excludes typename when no straightforward view targets it', async ({ expect }) => {
    const viewObj = db.add(
      View.make({
        query: { ast: Query.select(Filter.nothing()).ast },
      }),
    );
    db.add(Obj.make(TestViewWrapper, { view: Ref.make(viewObj) }));
    await db.flush();

    const allSchemas = db.graph.registry
      .list()
      .filter(Type.isType)
      .filter((t) => !Type.isTypeKind(t));
    const viewIndex = buildViewIndex(registry.get.bind(registry) as any, { db } as any, allSchemas);

    expect(viewIndex.typeUrisWithViews.has(Type.getURI(TestContact))).toBe(false);
    expect(viewIndex.typeUrisWithViews.size).toBe(0);
  });

  test('getViewsForTypeUri returns matching view objects', async ({ expect }) => {
    const viewObj = db.add(
      View.make({
        query: { ast: Query.select(Filter.type(TestContact)).ast },
      }),
    );
    const tableView = db.add(Obj.make(TestViewWrapper, { view: Ref.make(viewObj) }));
    await db.flush();

    const allSchemas = db.graph.registry
      .list()
      .filter(Type.isType)
      .filter((t) => !Type.isTypeKind(t));
    const viewIndex = buildViewIndex(registry.get.bind(registry) as any, { db } as any, allSchemas);

    const views = viewIndex.getViewsForTypeUri(Type.getURI(TestContact));
    expect(views).toHaveLength(1);
    expect(views[0].id).toBe(tableView.id);
  });

  test('returns empty index when no view schemas exist', async ({ expect }) => {
    await db.flush();

    const userSchemas = db.graph.registry
      .list()
      .filter(Type.isType)
      .filter((t) => !Type.isTypeKind(t))
      .filter((schema) => !ViewAnnotation.has(schema));
    const viewIndex = buildViewIndex(registry.get.bind(registry) as any, { db } as any, userSchemas);

    expect(viewIndex.typeUrisWithViews.size).toBe(0);
    expect(viewIndex.getViewsForTypeUri(Type.getURI(TestContact))).toHaveLength(0);
  });
});

describe('checkPendingMigration', () => {
  const TARGET = '1970-01-02';

  // Minimal fake exercising only the fields checkPendingMigration reads (state, properties).
  // Must pass isEntity (checks for Entity.KindId) and have Obj.Meta so Annotation.get works.
  const makeFakeProperties = (version?: string): Record<string | symbol, unknown> => {
    const annotations: Record<string, unknown> = {};
    if (version !== undefined) {
      Annotation.setDictionary(annotations as any, MigrationVersionAnnotation, version);
    }
    return {
      [Entity.KindId]: Entity.Kind.Object,
      [Obj.Meta]: { keys: [], annotations },
    };
  };

  const makeFakeSpace = (state: SpaceState, version?: string): Space =>
    ({ state: { get: () => state }, properties: makeFakeProperties(version) }) as unknown as Space;

  let savedNamespace: string | undefined;
  let savedMigrations: typeof Migrations.migrations;

  beforeEach(() => {
    savedNamespace = Migrations.namespace;
    savedMigrations = Migrations.migrations;
    Migrations.define('test', [
      { version: '1970-01-01', next: async () => {} },
      { version: TARGET, next: async () => {} },
    ]);
  });

  afterEach(() => {
    Migrations.namespace = savedNamespace;
    Migrations.migrations = savedMigrations;
  });

  test('SPACE_REQUIRES_MIGRATION is pending regardless of version property', ({ expect }) => {
    const space = makeFakeSpace(SpaceState.SPACE_REQUIRES_MIGRATION, TARGET);
    expect(checkPendingMigration(space)).toBe(true);
  });

  test('READY with version matching target is not pending', ({ expect }) => {
    const space = makeFakeSpace(SpaceState.SPACE_READY, TARGET);
    expect(checkPendingMigration(space)).toBe(false);
  });

  test('READY with undefined version is pending (legacy property-migration preserved)', ({ expect }) => {
    const space = makeFakeSpace(SpaceState.SPACE_READY);
    expect(checkPendingMigration(space)).toBe(true);
  });

  test('READY with stale version is pending', ({ expect }) => {
    const space = makeFakeSpace(SpaceState.SPACE_READY, '1970-01-01');
    expect(checkPendingMigration(space)).toBe(true);
  });
});
