//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Schema from 'effect/Schema';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { SpaceProperties } from '@dxos/client-protocol';
import { Collection, DXN, Database, Obj, Query, Ref, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionInvocationService } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { HasSubject } from '@dxos/types';

import DailySummaryBlueprint from '../daily-summary-blueprint';

import { GenerateSummary } from './definitions';

ObjectId.dangerouslyDisableRandomness();

const MarkdownDocument = Schema.Struct({
  name: Schema.optional(Schema.String),
  content: Ref.Ref(Text.Text),
}).pipe(Type.object({ typename: 'org.dxos.type.document', version: '0.1.0' }));

const WithProperties = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R | Database.Service> =>
  Effect.zipRight(
    Effect.gen(function* () {
      yield* Database.add(
        Obj.make(SpaceProperties, {
          [Collection.Collection.typename]: Ref.make(Collection.make()),
        }) as any,
      );
    }),
    effect,
  );

const TestLayer = AssistantTestLayer({
  operationHandlers: DailySummaryBlueprint.operations,
  types: [SpaceProperties, Collection.Collection, Blueprint.Blueprint, MarkdownDocument, HasSubject.HasSubject],
  tracing: 'pretty',
});

describe('GenerateSummary', () => {
  it.effect(
    'creates a Markdown document with summary content',
    Effect.fnUntraced(
      function* (_) {
        const result = yield* FunctionInvocationService.invokeFunction(GenerateSummary, {
          lookbackHours: 24,
        });

        expect(result.id).toBeTruthy();
        expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(result.objectCount).toBeGreaterThanOrEqual(0);

        const doc = yield* Database.resolve(DXN.parse(result.id), MarkdownDocument);
        expect(doc.name).toContain('Daily Summary');
        const text = yield* Database.load(doc.content);
        expect(text.content).toContain('Daily Summary');
        expect(text.content).toContain('objects were modified today');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'creates a "Summaries" collection if none exists',
    Effect.fnUntraced(
      function* (_) {
        yield* FunctionInvocationService.invokeFunction(GenerateSummary, {});

        const collections = yield* Database.runQuery(Query.type(Collection.Collection, { name: 'Summaries' }));
        expect(collections.length).toBe(1);
        expect(collections[0].objects.length).toBe(1);
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reuses existing "Summaries" collection on subsequent calls',
    Effect.fnUntraced(
      function* (_) {
        yield* FunctionInvocationService.invokeFunction(GenerateSummary, {});
        yield* FunctionInvocationService.invokeFunction(GenerateSummary, {});

        const collections = yield* Database.runQuery(Query.type(Collection.Collection, { name: 'Summaries' }));
        expect(collections.length).toBe(1);
        expect(collections[0].objects.length).toBe(2);
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'includes previous summary in content when provided',
    Effect.fnUntraced(
      function* (_) {
        const previousSummary = 'Yesterday was productive. 10 objects edited.';
        const result = yield* FunctionInvocationService.invokeFunction(GenerateSummary, {
          previousSummary,
          lookbackHours: 24,
        });

        const doc = yield* Database.resolve(DXN.parse(result.id), MarkdownDocument);
        const text = yield* Database.load(doc.content);
        expect(text.content).toContain('Previous Summary');
        expect(text.content).toContain(previousSummary);
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'names document with today date',
    Effect.fnUntraced(
      function* (_) {
        const result = yield* FunctionInvocationService.invokeFunction(GenerateSummary, {});
        const today = new Date().toISOString().slice(0, 10);
        expect(result.date).toBe(today);

        const doc = yield* Database.resolve(DXN.parse(result.id), MarkdownDocument);
        expect(doc.name).toContain(today);
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
