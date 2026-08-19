//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AssistantTestLayerWithTriggers } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Annotation, Database, Feed, Obj, type QueryAST, Ref, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Organization, Person } from '@dxos/types';

import { OperationTestLayer } from '../../../testing';
import { Query as QueryOperation } from './definitions';
import { DatabaseHandlers } from './index';
import { typenameFilter } from './type-filter';

EntityId.dangerouslyDisableRandomness();

const WIDGET_TYPENAME = 'com.example.type.widget';

class Widget extends Type.makeObject<Widget>(DXN.make(WIDGET_TYPENAME, '0.2.0'))(
  Schema.Struct({ name: Schema.String }).pipe(Annotation.LabelAnnotation.set(['name'])),
) {}

const WidgetTestLayer = AssistantTestLayerWithTriggers({
  operationHandlers: OperationHandlerSet.merge(DatabaseHandlers),
  types: [Widget],
  disableLlmMemoization: true,
});

describe('Query', () => {
  it.effect(
    'query: finds objects by typename',
    Effect.fnUntraced(
      function* (_) {
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Acme Corp' }));
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Globex Industries' }));
        yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
        yield* Database.flush();

        const results = yield* Operation.invoke(QueryOperation, {
          typename: Type.getTypename(Organization.Organization),
          limit: 20,
        });

        expect((yield* rows(results)).map((row) => row.label).sort()).toEqual(['Acme Corp', 'Globex Industries']);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query: the in param scopes results to the given feed',
    Effect.fnUntraced(
      function* (_) {
        const inbox1 = Feed.make({ name: 'inbox-1' });
        yield* Database.add(inbox1);
        yield* Feed.append(inbox1, [Obj.make(Organization.Organization, { name: 'Email Corp Alpha' })]);

        const inbox2 = Feed.make({ name: 'inbox-2' });
        yield* Database.add(inbox2);
        yield* Feed.append(inbox2, [Obj.make(Organization.Organization, { name: 'Email Corp Beta' })]);
        yield* Database.flush();

        const results = yield* Operation.invoke(QueryOperation, {
          typename: Type.getTypename(Organization.Organization),
          in: [Ref.make(inbox1)],
          includeQueues: true,
          limit: 20,
        });

        expect((yield* rows(results)).map((row) => row.label)).toEqual(['Email Corp Alpha']);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query operation: includeQueues via invokeFunction',
    Effect.fnUntraced(
      function* (_) {
        const feed = Feed.make();
        yield* Database.add(feed);
        yield* Feed.append(feed, [
          Obj.make(Organization.Organization, {
            name: 'Invoke Op Lot Co',
            description: 'Feed-only mock email op-search-token-7f3a2c91 reservation line.',
          }),
        ]);
        yield* Database.flush();

        const noQueues = yield* Operation.invoke(QueryOperation, {
          text: 'op-search-token-7f3a2c91',
          includeQueues: false,
          limit: 20,
        });
        expect(noQueues).toHaveLength(0);

        const withQueues = yield* Operation.invoke(QueryOperation, {
          text: 'op-search-token-7f3a2c91',
          includeQueues: true,
          limit: 20,
        });
        expect(withQueues.length).toBeGreaterThanOrEqual(1);
        expect(
          (yield* rows(withQueues)).some(
            (row) =>
              row.typename === Type.getTypename(Organization.Organization) &&
              String(row.label ?? '').includes('Invoke Op Lot'),
          ),
        ).toBe(true);

        const byTypename = yield* Operation.invoke(QueryOperation, {
          typename: Type.getTypename(Organization.Organization),
          includeQueues: true,
          limit: 20,
        });
        expect(byTypename.length).toBeGreaterThanOrEqual(1);
        expect(
          (yield* rows(byTypename)).some(
            (row) =>
              row.typename === Type.getTypename(Organization.Organization) &&
              String(row.label ?? '').includes('Invoke Op Lot'),
          ),
        ).toBe(true);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
  it.effect(
    'query: the typename filter is version-agnostic',
    Effect.fnUntraced(
      function* (_) {
        yield* Database.add(Obj.make(Widget, { name: 'Current Widget' }));
        yield* Database.flush();

        const results = yield* Operation.invoke(QueryOperation, { typename: WIDGET_TYPENAME, limit: 20 });
        expect((yield* rows(results)).map((row) => row.label)).toEqual(['Current Widget']);

        // The registered schema is `@0.2.0`, so a filter built from it alone would miss an object
        // stamped with any other version of the typename — hence the unversioned branch.
        const filter = yield* typenameFilter(WIDGET_TYPENAME);
        expect(typenamesOf(filter.ast).some((typename) => typename.endsWith(`:${WIDGET_TYPENAME}`))).toBe(true);
      },
      Effect.provide(WidgetTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query: an unknown typename returns no results rather than failing',
    Effect.fnUntraced(
      function* (_) {
        const results = yield* Operation.invoke(QueryOperation, { typename: 'com.example.type.absent', limit: 20 });
        expect(results).toEqual([]);
      },
      Effect.provide(WidgetTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query: expandDepth inlines referenced objects',
    Effect.fnUntraced(
      function* (_) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        yield* Database.add(Obj.make(Person.Person, { fullName: 'Miles Dyson', organization: Ref.make(organization) }));
        yield* Database.flush();

        const unexpanded = yield* Operation.invoke(QueryOperation, {
          typename: Type.getTypename(Person.Person),
          includeContent: true,
          limit: 20,
        });
        const [unexpandedRow] = yield* refRows(unexpanded);
        expect(unexpandedRow.organization).toEqual({ '/': `echo:///${organization.id}` });

        const expanded = yield* Operation.invoke(QueryOperation, {
          typename: Type.getTypename(Person.Person),
          includeContent: true,
          expandDepth: 1,
          limit: 20,
        });
        const [expandedRow] = yield* expandedRefRows(expanded);
        expect(expandedRow.organization.name).toEqual('Cyberdyne Systems');
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

/** The type discriminators a filter AST matches on, across its OR branches. */
const typenamesOf = (ast: QueryAST.Filter): string[] =>
  ast.type === 'object'
    ? typeof ast.typename === 'string'
      ? [ast.typename]
      : []
    : 'filters' in ast
      ? ast.filters.flatMap(typenamesOf)
      : [];

const refRows = (results: readonly unknown[]) =>
  Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({ organization: Schema.Unknown })))(results);

const expandedRefRows = (results: readonly unknown[]) =>
  Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({ organization: Schema.Struct({ name: Schema.String }) })))(
    results,
  );

// The operation's output is `Schema.Unknown`; decode rather than cast.
const rows = (results: readonly unknown[]) =>
  Schema.decodeUnknownEffect(
    Schema.Array(Schema.Struct({ typename: Schema.optional(Schema.String), label: Schema.optional(Schema.String) })),
  )(results);
