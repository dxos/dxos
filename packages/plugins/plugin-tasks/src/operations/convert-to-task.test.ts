//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Filter, Obj } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { invariant } from '@dxos/invariant';
import { Text } from '@dxos/schema';
import { Outline, Task, TaskSet } from '@dxos/types';

import convertToTask from './convert-to-task';

const testLayer = () => TestDatabaseLayer({ types: [Outline.Outline, Task.Task, TaskSet.TaskSet, Text.Text] });

describe('convert-to-task', () => {
  it.effect("promotes an item into the outline's own task set, created on first use", () =>
    Effect.gen(function* () {
      const outline = yield* seed('- [ ] first\n- [ ] second');
      expect(outline.taskSet).toBeUndefined();

      const { task } = yield* convertToTask.handler({ outline, title: '  first  ' });

      const taskSet = yield* loadTaskSet(outline);
      expect(taskSet.name).toBe('Launch plan');
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([task.id]);
      // `Outline.addTask` trims, so a markdown line's surrounding whitespace never reaches the title.
      expect(task.title).toBe('first');
      expect(task.status).toBe('todo');
      // Membership is the array; the parent edge rides along so the task cascades with the set.
      expect(Obj.getParent(task)?.id).toBe(taskSet.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('a second promotion files into the same set rather than linking another', () =>
    Effect.gen(function* () {
      const outline = yield* seed('- [ ] first\n- [ ] second');

      const { task: first } = yield* convertToTask.handler({ outline, title: 'first' });
      const { task: second } = yield* convertToTask.handler({ outline, title: 'second' });

      const taskSet = yield* loadTaskSet(outline);
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([first.id, second.id]);
      const sets = yield* Database.query(Filter.type(TaskSet.TaskSet)).run;
      expect(sets).toHaveLength(1);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('the checklist markdown is left untouched — the item is copied, not moved', () =>
    Effect.gen(function* () {
      const outline = yield* seed('- [ ] first\n- [ ] second');

      yield* convertToTask.handler({ outline, title: 'first' });

      // Promotion takes a title, not a line: nothing strikes the bullet or links the new task back
      // into the document, so the same item can be promoted twice.
      const content = yield* Database.load(outline.content);
      expect(content.content).toBe('- [ ] first\n- [ ] second');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('a title matching no checklist item is still promoted', () =>
    Effect.gen(function* () {
      const outline = yield* seed('- [ ] first');

      const { task } = yield* convertToTask.handler({ outline, title: 'invented' });

      expect(task.title).toBe('invented');
    }).pipe(Effect.provide(testLayer())),
  );
});

/** Seeds an outline with the given checklist markdown. */
const seed = (content: string) =>
  Effect.gen(function* () {
    const outline = yield* Database.add(Outline.make({ name: 'Launch plan', content }));
    yield* Database.flush();
    return outline;
  });

/** The set the outline linked on its first promotion. */
const loadTaskSet = (outline: Outline.Outline) =>
  Effect.gen(function* () {
    const taskSet = outline.taskSet;
    invariant(taskSet, 'Expected the outline to link a task set.');
    return yield* Database.load(taskSet);
  });
