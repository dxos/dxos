//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Spec from '@dxos/compute/Spec';
import { Database, Filter, Query, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Task } from '@dxos/types';

import { CodeOperation, FeatureMap, SpecItem } from '#types';

import linkTask from './link-task.ts';

const testLayer = () => TestDatabaseLayer({ types: CodeOperation.SPEC_ITEM_TYPES });

describe('CodeOperation.LinkTask', () => {
  it.effect('links a task to the block a label names, by its key, once', () =>
    Effect.gen(function* () {
      const content = ['```mdl', 'feat k1: Sync', '```', ''].join('\n');
      const spec = yield* Database.add(Spec.make({ name: 'Mail', dialects: [FeatureMap.SOFTWARE_DIALECT], content }));
      const task = yield* Database.add(Task.make({ title: 'Sync Gmail' }));
      const input = { task: Ref.make(task), spec: Ref.make(spec), item: 'F-1' };

      yield* linkTask.handler(input);
      yield* linkTask.handler(input);
      const links = yield* Database.query(Query.select(Filter.id(spec.id)).targetOf(SpecItem.Implements)).run;
      expect(links.map(({ item }) => item)).toEqual(['k1']);

      const missing = yield* Effect.flip(linkTask.handler({ ...input, item: 'F-9' }));
      expect(missing.message).toContain('F-9');
    }).pipe(Effect.provide(testLayer())),
  );
});
