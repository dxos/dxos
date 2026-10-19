//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { Database, Filter, Query, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { File, Milestone, PullRequest, Task } from '@dxos/types';

import { Feature, FeatureMap, Showcase } from '#types';

import addDependency from './add-dependency.ts';
import addToMap from './add-to-map.ts';
import createMap from './create-map.ts';
import createShowcase from './create-showcase.ts';
import create from './create.ts';
import getMap from './get-map.ts';
import linkTask from './link-task.ts';
import removeDependency from './remove-dependency.ts';
import removeFromMap from './remove-from-map.ts';
import update from './update.ts';

const testLayer = () =>
  TestDatabaseLayer({
    types: [
      Feature.Feature,
      Feature.DependsOn,
      Feature.Implements,
      FeatureMap.FeatureMap,
      Showcase.Showcase,
      Showcase.Demonstrates,
      Task.Task,
      Milestone.Milestone,
      Text.Text,
      File.File,
      PullRequest.PullRequest,
    ],
  });

const ref = Ref.make;

describe('FeatureOperation.Create', () => {
  it.effect('defaults to planned and places the feature on the map given', () =>
    Effect.gen(function* () {
      const map = yield* Database.add(FeatureMap.make({ name: 'Inbox' }));
      const { feature } = yield* create.handler({ name: 'Provider sync', map: ref(map) });
      expect(feature.status).toBe('planned');
      expect(map.features).toHaveLength(1);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.Update', () => {
  it.effect('sets the fields given, replacing the subfeature list, and keeps the rest', () =>
    Effect.gen(function* () {
      const sync = yield* Database.add(Feature.make({ name: 'Sync', status: 'planned', description: 'Kept.' }));
      yield* update.handler({
        feature: ref(sync),
        status: 'operational',
        specs: ['a.mdl#F-1'],
        subfeatures: [{ name: 'Gmail', status: 'prototype' }],
      });
      expect(sync).toMatchObject({
        name: 'Sync',
        description: 'Kept.',
        status: 'operational',
        specs: ['a.mdl#F-1'],
        subfeatures: [{ name: 'Gmail', status: 'prototype' }],
      });
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.AddDependency', () => {
  it.effect('is idempotent and refuses a cycle, naming it', () =>
    Effect.gen(function* () {
      const accounts = yield* Database.add(Feature.make({ name: 'Accounts', status: 'operational' }));
      const tokens = yield* Database.add(Feature.make({ name: 'Tokens', status: 'operational' }));
      const sync = yield* Database.add(Feature.make({ name: 'Sync', status: 'prototype' }));
      yield* addDependency.handler({ feature: ref(tokens), dependsOn: ref(accounts) });
      yield* addDependency.handler({ feature: ref(tokens), dependsOn: ref(accounts) });
      yield* addDependency.handler({ feature: ref(sync), dependsOn: ref(tokens) });
      expect(yield* Database.query(Filter.type(Feature.DependsOn)).run).toHaveLength(2);

      const exit = yield* Effect.exit(addDependency.handler({ feature: ref(accounts), dependsOn: ref(sync) }));
      expect(Exit.isFailure(exit)).toBe(true);
      expect(String(Exit.isFailure(exit) && exit.cause)).toContain(
        'Accounts → Sync → Tokens → Accounts would close a cycle',
      );
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.RemoveDependency', () => {
  it.effect('removes only the named edge', () =>
    Effect.gen(function* () {
      const accounts = yield* Database.add(Feature.make({ name: 'Accounts', status: 'operational' }));
      const tokens = yield* Database.add(Feature.make({ name: 'Tokens', status: 'operational' }));
      const sync = yield* Database.add(Feature.make({ name: 'Sync', status: 'prototype' }));
      yield* addDependency.handler({ feature: ref(sync), dependsOn: ref(tokens) });
      yield* addDependency.handler({ feature: ref(sync), dependsOn: ref(accounts) });
      yield* removeDependency.handler({ feature: ref(sync), dependsOn: ref(tokens) });
      const remaining = yield* Database.query(Query.select(Filter.id(sync.id)).sourceOf(Feature.DependsOn).target())
        .run;
      expect(remaining.map(({ id }) => id)).toEqual([accounts.id]);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.LinkTask', () => {
  it.effect('links a task once however often it is called', () =>
    Effect.gen(function* () {
      const compose = yield* Database.add(Feature.make({ name: 'Compose', status: 'in-progress' }));
      const task = yield* Database.add(Task.make({ title: 'Send through Gmail', status: 'started' }));
      yield* linkTask.handler({ task: ref(task), feature: ref(compose) });
      yield* linkTask.handler({ task: ref(task), feature: ref(compose) });
      const tasks = yield* Database.query(Query.select(Filter.id(compose.id)).targetOf(Feature.Implements)).run;
      expect(tasks).toHaveLength(1);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.CreateShowcase', () => {
  it.effect('writes nothing when a target does not resolve', () =>
    Effect.gen(function* () {
      const gone = yield* Database.add(Feature.make({ name: 'Gone', status: 'planned' }));
      yield* Database.remove(gone);
      yield* Database.flush();
      const exit = yield* Effect.exit(createShowcase.handler({ name: 'Orphan', content: '', targets: [ref(gone)] }));
      expect(Exit.isFailure(exit)).toBe(true);
      expect(yield* Database.query(Filter.type(Showcase.Showcase)).run).toHaveLength(0);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('demonstrates every target and keeps its artifacts as refs', () =>
    Effect.gen(function* () {
      const compose = yield* Database.add(Feature.make({ name: 'Compose', status: 'operational' }));
      const task = yield* Database.add(Task.make({ title: 'Send through Gmail' }));
      const pullRequest = yield* Database.add(
        PullRequest.make({ owner: 'dxos', repo: 'dxos', number: 1, title: 'Send', state: 'open' }),
      );
      const { showcase } = yield* createShowcase.handler({
        name: 'Sending a reply',
        content: 'Reply from the inbox.',
        targets: [ref(compose), ref(task)],
        artifacts: [ref(pullRequest)],
      });
      for (const target of [compose, task]) {
        const shown = yield* Database.query(Query.select(Filter.id(target.id)).targetOf(Showcase.Demonstrates).source())
          .run;
        expect(shown.map(({ id }) => id)).toEqual([showcase.id]);
      }
      expect(showcase.artifacts).toHaveLength(1);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.AddToMap', () => {
  it.effect('adds a feature once', () =>
    Effect.gen(function* () {
      const map = yield* Database.add(FeatureMap.make({ name: 'Inbox' }));
      const compose = yield* Database.add(Feature.make({ name: 'Compose', status: 'planned' }));
      yield* addToMap.handler({ map: ref(map), feature: ref(compose) });
      yield* addToMap.handler({ map: ref(map), feature: ref(compose) });
      expect(map.features).toHaveLength(1);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.CreateMap', () => {
  it.effect('creates a map holding the features given', () =>
    Effect.gen(function* () {
      const compose = yield* Database.add(Feature.make({ name: 'Compose', status: 'planned' }));
      const { map } = yield* createMap.handler({ name: 'Inbox', features: [ref(compose)] });
      expect(map.name).toBe('Inbox');
      expect(map.features).toHaveLength(1);
      expect(yield* Database.query(Filter.type(FeatureMap.FeatureMap)).run).toHaveLength(1);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.RemoveFromMap', () => {
  it.effect('takes a feature off the map and keeps the feature', () =>
    Effect.gen(function* () {
      const compose = yield* Database.add(Feature.make({ name: 'Compose', status: 'planned' }));
      const sync = yield* Database.add(Feature.make({ name: 'Sync', status: 'planned' }));
      const { map } = yield* createMap.handler({ name: 'Inbox', features: [ref(compose), ref(sync)] });
      yield* removeFromMap.handler({ map: ref(map), feature: ref(compose) });
      yield* removeFromMap.handler({ map: ref(map), feature: ref(compose) });
      expect(map.features).toHaveLength(1);
      expect(yield* Database.query(Filter.type(Feature.Feature)).run).toHaveLength(2);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.GetMap', () => {
  it.effect('reads each member with its dependencies, tasks, showcases and subfeatures', () =>
    Effect.gen(function* () {
      const map = yield* Database.add(FeatureMap.make({ name: 'Inbox' }));
      const compose = yield* Database.add(
        Feature.make({ name: 'Compose', status: 'in-progress', subfeatures: [{ name: 'Drafts', status: 'planned' }] }),
      );
      const sync = yield* Database.add(Feature.make({ name: 'Sync', status: 'prototype' }));
      const task = yield* Database.add(Task.make({ title: 'Send through Gmail', status: 'started' }));
      yield* addToMap.handler({ map: ref(map), feature: ref(compose) });
      yield* addToMap.handler({ map: ref(map), feature: ref(sync) });
      yield* addDependency.handler({ feature: ref(compose), dependsOn: ref(sync) });
      yield* linkTask.handler({ task: ref(task), feature: ref(compose) });
      const { showcase } = yield* createShowcase.handler({
        name: 'Sending a reply',
        content: 'Reply from the inbox.',
        targets: [ref(compose)],
      });

      const gone = yield* Database.add(Feature.make({ name: 'Gone', status: 'planned' }));
      yield* addToMap.handler({ map: ref(map), feature: ref(gone) });
      yield* Database.remove(gone);
      yield* Database.flush();

      const result = yield* getMap.handler({ map: ref(map) });
      expect(result.features.map(({ name }) => name)).toEqual(['Compose', 'Sync']);
      expect(result.features[0]).toMatchObject({
        subfeatures: [{ name: 'Drafts', status: 'planned' }],
        dependsOn: [sync.id],
        tasks: [{ id: task.id, title: 'Send through Gmail', status: 'started' }],
        showcases: [{ id: showcase.id, name: 'Sending a reply' }],
      });
    }).pipe(Effect.provide(testLayer())),
  );
});
