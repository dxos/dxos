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
import createShowcase from './create-showcase.ts';
import create from './create.ts';
import getMap from './get-map.ts';
import linkTask from './link-task.ts';
import removeDependency from './remove-dependency.ts';
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

describe('feature operations', () => {
  it.effect('create places a feature on a map; update sets its fields and subfeatures', () =>
    Effect.gen(function* () {
      const map = yield* Database.add(FeatureMap.make({ name: 'Inbox' }));
      const { feature: sync } = yield* create.handler({ name: 'Provider sync', map: Ref.make(map) });
      expect(sync.status).toBe('planned');
      expect(map.features).toHaveLength(1);

      yield* update.handler({
        feature: Ref.make(sync),
        status: 'operational',
        specs: ['a.mdl#F-1'],
        subfeatures: [{ name: 'Gmail', status: 'prototype' }],
      });
      expect(sync.status).toBe('operational');
      expect(sync.specs).toEqual(['a.mdl#F-1']);
      expect(sync.subfeatures).toEqual([{ name: 'Gmail', status: 'prototype' }]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('dependencies are idempotent, removable, and refuse a cycle by name', () =>
    Effect.gen(function* () {
      const accounts = yield* Database.add(Feature.make({ name: 'Accounts', status: 'operational' }));
      const tokens = yield* Database.add(Feature.make({ name: 'Tokens', status: 'operational' }));
      const sync = yield* Database.add(Feature.make({ name: 'Sync', status: 'prototype' }));
      yield* addDependency.handler({ feature: Ref.make(tokens), dependsOn: Ref.make(accounts) });
      yield* addDependency.handler({ feature: Ref.make(tokens), dependsOn: Ref.make(accounts) });
      yield* addDependency.handler({ feature: Ref.make(sync), dependsOn: Ref.make(tokens) });
      expect(yield* Database.query(Filter.type(Feature.DependsOn)).run).toHaveLength(2);

      const exit = yield* Effect.exit(
        addDependency.handler({ feature: Ref.make(accounts), dependsOn: Ref.make(sync) }),
      );
      expect(Exit.isFailure(exit)).toBe(true);
      expect(String(Exit.isFailure(exit) && exit.cause)).toContain('Sync → Tokens → Accounts');

      yield* removeDependency.handler({ feature: Ref.make(sync), dependsOn: Ref.make(tokens) });
      expect(yield* Database.query(Filter.type(Feature.DependsOn)).run).toHaveLength(1);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('linked tasks and showcases appear in the map read', () =>
    Effect.gen(function* () {
      const map = yield* Database.add(FeatureMap.make({ name: 'Inbox' }));
      const compose = yield* Database.add(Feature.make({ name: 'Compose', status: 'in-progress' }));
      const sync = yield* Database.add(Feature.make({ name: 'Sync', status: 'prototype' }));
      const task = yield* Database.add(Task.make({ title: 'Send through Gmail', status: 'started' }));
      yield* addToMap.handler({ map: Ref.make(map), feature: Ref.make(compose) });
      yield* addToMap.handler({ map: Ref.make(map), feature: Ref.make(compose) });
      yield* addToMap.handler({ map: Ref.make(map), feature: Ref.make(sync) });
      yield* addDependency.handler({ feature: Ref.make(compose), dependsOn: Ref.make(sync) });
      yield* linkTask.handler({ task: Ref.make(task), feature: Ref.make(compose) });
      yield* linkTask.handler({ task: Ref.make(task), feature: Ref.make(compose) });
      const { showcase } = yield* createShowcase.handler({
        name: 'Sending a reply',
        content: 'Reply from the inbox.',
        targets: [Ref.make(compose), Ref.make(task)],
      });

      const shown = yield* Database.query(Query.select(Filter.id(task.id)).targetOf(Showcase.Demonstrates).source())
        .run;
      expect(shown.map(({ id }) => id)).toEqual([showcase.id]);

      const result = yield* getMap.handler({ map: Ref.make(map) });
      expect(result.features.map(({ name }) => name)).toEqual(['Compose', 'Sync']);
      expect(result.features[0]).toMatchObject({
        dependsOn: [sync.id],
        tasks: [{ id: task.id, title: 'Send through Gmail', status: 'started' }],
        showcases: [{ id: showcase.id, name: 'Sending a reply' }],
      });
    }).pipe(Effect.provide(testLayer())),
  );
});
