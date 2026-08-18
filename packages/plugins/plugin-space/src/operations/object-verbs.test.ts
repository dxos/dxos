//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Database, DXN, Feed, Obj, Ref, Tag, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EID } from '@dxos/keys';

import { SpaceObjectOperation } from '#types';

import AddTagHandler from './add-tag';
import GetObjectsHandler from './get-objects';
import QueryObjectsHandler from './query-objects';
import QueryTypesHandler from './query-types';
import RemoveTagHandler from './remove-tag';

/** The verbs return `unknown` (any ECHO shape), so the assertions decode the fields they read. */
const decodeNamed = Schema.decodeUnknownSync(Schema.Struct({ name: Schema.optional(Schema.String) }));
const decodeRow = Schema.decodeUnknownSync(Schema.Struct({ label: Schema.optional(Schema.String) }));
const labelOf = (row: unknown): string => decodeRow(row).label ?? '';
const decodeTypeRow = Schema.decodeUnknownSync(
  Schema.Struct({ typename: Schema.String, jsonSchema: Schema.optional(Schema.Unknown) }),
);

class TestObject extends Type.makeObject<TestObject>(DXN.make('com.example.type.testObject', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
  }),
) {}

const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.make(
    AddTagHandler,
    GetObjectsHandler,
    QueryObjectsHandler,
    QueryTypesHandler,
    RemoveTagHandler,
  ),
  types: [Skill.Skill, Feed.Feed, Tag.Tag, TestObject],
  disableLlmMemoization: true,
});

describe('object verbs', () => {
  it.effect(
    'getObjects reads every reference in one call',
    Effect.fnUntraced(
      function* ({ expect }) {
        const first = yield* Database.add(Obj.make(TestObject, { name: 'first' }));
        const second = yield* Database.add(Obj.make(TestObject, { name: 'second' }));
        yield* Database.flush();

        const { objects } = yield* Operation.invoke(SpaceObjectOperation.GetObjects, {
          objects: [Ref.make(first), Ref.make(second)],
        });

        expect(objects).toHaveLength(2);
        expect(objects.map((object) => decodeNamed(object).name)).toEqual(['first', 'second']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'queryObjects finds feed content only with includeQueues',
    Effect.fnUntraced(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        yield* Feed.append(feed, [
          Obj.make(TestObject, { name: 'Lot Booking Co', description: 'search-token-7f3a2c91' }),
        ]);
        yield* Database.flush();

        // Feed-backed content lives behind a feed ref, so a plain space query cannot see it.
        const { results: spaceOnly } = yield* Operation.invoke(SpaceObjectOperation.QueryObjects, {
          text: 'search-token-7f3a2c91',
          limit: 20,
        });
        expect(spaceOnly).toHaveLength(0);

        const { results } = yield* Operation.invoke(SpaceObjectOperation.QueryObjects, {
          text: 'search-token-7f3a2c91',
          includeQueues: true,
          limit: 20,
        });
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results.some((row) => labelOf(row).includes('Lot Booking'))).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'queryObjects `in` scopes results to the named feed',
    Effect.fnUntraced(
      function* ({ expect }) {
        const inbox = yield* Database.add(Feed.make({ name: 'inbox-1' }));
        yield* Feed.append(inbox, [Obj.make(TestObject, { name: 'Alpha', description: 'in-param-token' })]);
        const archive = yield* Database.add(Feed.make({ name: 'inbox-2' }));
        yield* Feed.append(archive, [Obj.make(TestObject, { name: 'Beta', description: 'in-param-token' })]);
        yield* Database.flush();

        const { results } = yield* Operation.invoke(SpaceObjectOperation.QueryObjects, {
          in: [Ref.make(inbox)],
          text: 'in-param-token',
          includeQueues: true,
          limit: 20,
        });

        const labels = results.map(labelOf);
        expect(labels.some((label) => label.includes('Alpha'))).toBe(true);
        expect(labels.some((label) => label.includes('Beta'))).toBe(false);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'addTag then removeTag round-trips a tag on an object',
    Effect.fnUntraced(
      function* ({ expect }) {
        const tag = yield* Database.add(Tag.make({ label: 'important' }));
        const object = yield* Database.add(Obj.make(TestObject, { name: 'tagged' }));
        yield* Database.flush();

        yield* Operation.invoke(SpaceObjectOperation.AddTag, { tag: Ref.make(tag), object: Ref.make(object) });
        expect(taggedIds(object)).toContain(tag.id);

        yield* Operation.invoke(SpaceObjectOperation.RemoveTag, { tag: Ref.make(tag), object: Ref.make(object) });
        expect(taggedIds(object)).not.toContain(tag.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'queryTypes summarizes the space types, and returns a schema for the typenames named',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { types: summary } = yield* Operation.invoke(SpaceObjectOperation.QueryTypes, {});
        const typenames = summary.map((type) => decodeTypeRow(type).typename);
        expect(typenames).toContain('com.example.type.testObject');
        // The agent addresses skills and feeds through its own surface, so they only spend context.
        expect(typenames).not.toContain('dxos.org/type/Skill');

        const { types } = yield* Operation.invoke(SpaceObjectOperation.QueryTypes, {
          typenames: ['com.example.type.testObject'],
        });
        expect(types).toHaveLength(1);
        expect(decodeTypeRow(types[0]).jsonSchema).toBeDefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

// Compare by entity id: a same-space ref stores a local EID (`echo:/<id>`) while `Obj.getURI`
// returns the fully-qualified form.
const taggedIds = (object: Obj.Any): (string | undefined)[] =>
  Obj.getMeta(object).tags.map((ref) => EID.getEntityId(EID.parse(ref.uri)));
