//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Collection, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { Kanban } from '@dxos/plugin-kanban/types';
import { ViewModel } from '@dxos/schema';
import { Task } from '@dxos/types';

import { fetchRecentIssues, readLinearAuth, updateIssue } from './linear-client';

const LINEAR_SOURCE = 'linear.app';
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const WRITE_BACK_INTERVAL_MS = 10_000;
const KANBAN_NAME = 'Linear Issues';

const getLinearId = (obj: Task.Task): string | undefined => {
  const keys = Obj.getMeta(obj).keys;
  return keys?.find((key) => key.source === LINEAR_SOURCE)?.id;
};

const addToRootCollection = (space: any, obj: any): void => {
  const rootCollection = space.properties[Collection.Collection.typename]?.target;
  if (rootCollection) {
    Obj.change(rootCollection, (c: any) => { c.objects.push(Ref.make(obj)); });
  }
};

const syncOnce = async (space: any, auth: { apiKey: string }): Promise<void> => {
  const remoteTasks = await fetchRecentIssues(auth);
  const existingTasks: Task.Task[] = await space.db.query(Filter.type(Task.Task)).run();
  const existingLinearIds = new Set<string>();
  for (const task of existingTasks) {
    const linearId = getLinearId(task);
    if (linearId) {
      existingLinearIds.add(linearId);
    }
  }

  let added = 0;
  for (const task of remoteTasks) {
    const linearId = getLinearId(task);
    if (linearId && existingLinearIds.has(linearId)) {
      continue;
    }
    space.db.add(task);
    addToRootCollection(space, task);
    added++;
  }

  if (added > 0) {
    log.info('linear: synced issues', { added, total: remoteTasks.length });
  }

  const existingKanbans: Kanban.Kanban[] = await space.db.query(Filter.type(Kanban.Kanban)).run();
  if (!existingKanbans.some((kanban: any) => kanban.name === KANBAN_NAME)) {
    try {
      const { view } = await ViewModel.makeFromDatabase({
        db: space.db,
        typename: 'org.dxos.type.task',
        pivotFieldName: 'status',
        fields: ['title', 'status', 'priority', 'description'],
        createInitial: 0,
      });
      const kanban = Kanban.make({
        name: KANBAN_NAME,
        view,
        arrangement: { order: ['todo', 'in-progress', 'done'], columns: {} },
      });
      space.db.add(kanban);
      addToRootCollection(space, kanban);
      log.info('linear: created kanban board');
    } catch (error) {
      log.warn('linear: failed to create kanban', { error: error instanceof Error ? error.message : String(error) });
    }
  }
};

const startWriteBack = (space: any, auth: { apiKey: string }): void => {
  const snapshots = new Map<string, { status?: string; priority?: string; title?: string }>();

  void (async () => {
    const tasks: Task.Task[] = await space.db.query(Filter.type(Task.Task)).run();
    for (const task of tasks) {
      if (getLinearId(task)) {
        snapshots.set(task.id, { status: task.status, priority: task.priority, title: task.title });
      }
    }
  })();

  setInterval(async () => {
    try {
      const tasks: Task.Task[] = await space.db.query(Filter.type(Task.Task)).run();
      for (const task of tasks) {
        const linearId = getLinearId(task);
        if (!linearId) {
          continue;
        }
        const prev = snapshots.get(task.id);
        if (!prev) {
          snapshots.set(task.id, { status: task.status, priority: task.priority, title: task.title });
          continue;
        }
        const changes: Record<string, string | undefined> = {};
        if (task.status !== prev.status) {
          changes.status = task.status;
        }
        if (task.priority !== prev.priority) {
          changes.priority = task.priority;
        }
        if (task.title !== prev.title) {
          changes.title = task.title;
        }
        if (Object.keys(changes).length > 0) {
          await updateIssue(auth, linearId, changes);
          snapshots.set(task.id, { status: task.status, priority: task.priority, title: task.title });
        }
      }
    } catch (error) {
      log.warn('linear: write-back failed', { error: error instanceof Error ? error.message : String(error) });
    }
  }, WRITE_BACK_INTERVAL_MS);
};

const waitForSpace = async (client: any, maxWait = 30_000): Promise<any> => {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const spaces = client.spaces.get();
    if (spaces.length > 0) {
      return spaces[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return undefined;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const auth = readLinearAuth();
    if (!auth) {
      return;
    }

    const client = yield* Capability.get(ClientCapabilities.Client);

    yield* Effect.tryPromise({
      try: async () => {
        const space = await waitForSpace(client);
        if (!space) {
          return;
        }

        await syncOnce(space, auth);
        startWriteBack(space, auth);

        setInterval(async () => {
          try {
            await syncOnce(space, auth);
          } catch (error) {
            log.warn('linear: periodic sync failed', { error: error instanceof Error ? error.message : String(error) });
          }
        }, SYNC_INTERVAL_MS);
      },
      catch: (error: unknown) => {
        log.warn('linear: sync failed', { error: error instanceof Error ? error.message : String(error) });
        return new Error(error instanceof Error ? error.message : String(error));
      },
    });
  }),
);
