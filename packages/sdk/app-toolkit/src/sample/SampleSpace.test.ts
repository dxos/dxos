//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { SpaceProperties } from '@dxos/client-protocol';
import { Collection, Database, Feed, Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Organization, Person, Task, TaskSet } from '@dxos/types';

import { buildArchive, histogram } from '../testing/index.ts';
import * as SampleSpace from './SampleSpace.ts';

const ORG_SEEDS = [
  { key: 'acme', name: 'Acme' },
  { key: 'globex', name: 'Globex' },
] as const;

const PERSON_SEEDS = [
  { key: 'ada', fullName: 'Ada', org: 'acme' },
  { key: 'grace', fullName: 'Grace', org: 'globex' },
] as const;

type OrgKey = (typeof ORG_SEEDS)[number]['key'];
type Organizations = Record<OrgKey, Organization.Organization>;

const Organizations = SampleSpace.phase('organizations', {
  schemas: [Organization.Organization],
  run: () => SampleSpace.seed(ORG_SEEDS, ({ name }) => Database.add(Obj.make(Organization.Organization, { name }))),
});

const People = SampleSpace.phase('people', {
  schemas: [Person.Person],
  run: (organizations: Organizations) =>
    SampleSpace.seed(PERSON_SEEDS, ({ fullName, org }) =>
      Database.add(Obj.make(Person.Person, { fullName, organization: Ref.make(organizations[org]) })),
    ),
});

const Work = SampleSpace.phase('work', {
  schemas: [TaskSet.TaskSet, Task.Task],
  run: () =>
    Effect.gen(function* () {
      const opened = yield* SampleSpace.daysAgo(3);
      const taskSet = yield* Database.add(
        Obj.make(TaskSet.TaskSet, { name: 'Launch', description: opened, tasks: [], milestones: [] }),
      );
      const tasks = [Obj.make(Task.Task, { title: 'Roast' }), Obj.make(Task.Task, { title: 'Cup' })];
      yield* SampleSpace.children(taskSet, tasks, (taskSet, refs) => {
        taskSet.tasks = refs;
      });
      return { taskSet, tasks };
    }),
});

const Journal = SampleSpace.phase('journal', {
  schemas: [Feed.Feed, Task.Task],
  run: () =>
    Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const entries = [Obj.make(Task.Task, { title: 'Logged' })];
      // Queued, not appended: feed entities only get DXNs after the build's final flush.
      yield* SampleSpace.appendToFeed(feed, entries);
      return { feed, entries };
    }),
});

const definition = SampleSpace.make({
  space: { name: 'Sample', icon: 'potted-plant', hue: 'amber' },
  reference: '2026-05-20T15:00:00Z',
  phases: { organizations: Organizations, people: People, work: Work, journal: Journal },
  build: (phases) =>
    Effect.gen(function* () {
      const organizations = yield* phases.organizations();
      const people = yield* phases.people(organizations);
      const { taskSet, tasks } = yield* phases.work();
      const { feed, entries } = yield* phases.journal();
      const collection = yield* SampleSpace.collection('Work', [Ref.make(taskSet)]);
      return { organizations, people, taskSet, tasks, feed, entries, collection };
    }),
});

const TYPES = [
  SpaceProperties,
  Collection.Collection,
  Feed.Feed,
  Organization.Organization,
  Person.Person,
  Task.Task,
  TaskSet.TaskSet,
];

describe('definition', () => {
  test('derives its schemas from its phases', ({ expect }) => {
    expect(definition.schemas).toContain(Organization.Organization);
    expect(definition.schemas).toContain(Person.Person);
    expect(definition.schemas).toContain(Feed.Feed);
    // Declared by two phases, registered once.
    expect(definition.schemas.filter((schema) => schema === Task.Task)).toHaveLength(1);
  });
});

describe('clock', () => {
  test('resolves offsets against the reference date, not the wall clock', ({ expect }) => {
    const clock = SampleSpace.makeClock('2026-05-20T15:00:00Z');
    expect(clock.daysAgo(1)).toBe('2026-05-19T09:00:00.000Z');
    expect(clock.daysFromNow(1, 0)).toBe('2026-05-21T00:00:00.000Z');
  });
});

describe('applyTo', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const createSpace = async () => {
    const { db } = await builder.createDatabase({ types: TYPES });
    const properties = db.add(Obj.make(SpaceProperties, {}));
    await db.flush();
    return { db, properties };
  };

  test('runs every phase against a live space', async ({ expect }) => {
    const space = await createSpace();
    const result = await EffectEx.runPromise(SampleSpace.applyTo(definition, space));

    expect(Object.keys(result.organizations)).toEqual(['acme', 'globex']);
    expect(Object.keys(result.people)).toEqual(['ada', 'grace']);
    expect(result.people.ada.organization?.target?.name).toBe('Acme');
    expect(result.taskSet.description).toBe('2026-05-17T09:00:00.000Z');
  });

  test('files phase children under their parent and its membership array', async ({ expect }) => {
    const space = await createSpace();
    const result = await EffectEx.runPromise(SampleSpace.applyTo(definition, space));

    expect(result.taskSet.tasks.map((ref) => ref.target?.title)).toEqual(['Roast', 'Cup']);
    expect(Obj.getParent(result.tasks[0]!)?.id).toBe(result.taskSet.id);
  });

  test('wires collections under the space root', async ({ expect }) => {
    const space = await createSpace();
    const result = await EffectEx.runPromise(SampleSpace.applyTo(definition, space));

    const root = await EffectEx.runPromise(
      Effect.flatMap(SampleSpace.Root, ({ get }) => get).pipe(
        Effect.provide(SampleSpace.layer({ properties: space.properties, reference: definition.reference })),
        Effect.provide(Database.layer(space.db)),
      ),
    );
    expect(root.objects.map((ref) => ref.target?.id)).toContain(result.collection.id);
  });

  test('drains queued feed appends after the build', async ({ expect }) => {
    const space = await createSpace();
    const result = await EffectEx.runPromise(SampleSpace.applyTo(definition, space));

    const feedUri = Feed.getFeedUri(result.feed);
    expect(feedUri).toBeDefined();
    const entries = await space.db.query(Query.select(Filter.type(Task.Task)).from(Scope.feed(feedUri!))).run();
    expect(entries.map((entry) => entry.title)).toEqual(['Logged']);
  });
});

describe('buildArchive', () => {
  test('exports a headless build as one line of JSON', { timeout: 120_000 }, async ({ expect }) => {
    const { result, json, objectCount } = await EffectEx.runPromise(buildArchive(definition));

    expect(json.includes('\n')).toBe(false);
    expect(objectCount).toBeGreaterThan(0);
    expect(result.tasks).toHaveLength(2);

    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(countOf('type.organization')).toBe(2);
    expect(countOf('type.person')).toBe(2);
    expect(countOf('type.taskSet')).toBe(1);
    // Two set members plus the one queued feed entry.
    expect(countOf('type.task:')).toBe(3);
    // The space root plus 'Work'.
    expect(countOf('type.collection')).toBeGreaterThanOrEqual(2);
  });
});
