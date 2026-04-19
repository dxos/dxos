//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Collection, Database, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { Kanban } from '@dxos/plugin-kanban/types';
import { CollectionModel, ViewModel } from '@dxos/schema';
import { Task } from '@dxos/types';

import { fetchRecentIssues, readLinearAuth } from './linear-client';

const LINEAR_SOURCE = 'linear.app';
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const KANBAN_NAME = 'Linear Issues';

const getLinearId = (obj: Task.Task): string | undefined => {
  const keys = Obj.getMeta(obj).keys;
  return keys?.find((key) => key.source === LINEAR_SOURCE)?.id;
};

const syncOnce = async (client: { spaces: { get: () => any[] } }): Promise<void> => {
  const auth = readLinearAuth();
  if (!auth) {
    return;
  }

  const space = client.spaces.get()[0];
  if (!space) {
    return;
  }

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
    await Effect.runPromise(
      CollectionModel.add({ object: task }).pipe(Effect.provide(Database.layer(space.db))),
    );
    added++;
  }

  if (added > 0) {
    console.log('linear: synced issues', { added, total: remoteTasks.length });
  }

  const existingKanbans: Kanban.Kanban[] = await space.db.query(Filter.type(Kanban.Kanban)).run();
  const hasLinearKanban = existingKanbans.some((kanban) => kanban.name === KANBAN_NAME);
  if (!hasLinearKanban) {
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
      await Effect.runPromise(
        CollectionModel.add({ object: kanban }).pipe(Effect.provide(Database.layer(space.db))),
      );
      console.log('linear: created kanban board');
    } catch (error) {
      log.warn('linear: failed to create kanban', { error: error instanceof Error ? error.message : String(error) });
    }
  }
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
    console.log('linear: auto-sync module loaded');

    const client = yield* Capability.get(ClientCapabilities.Client);
    console.log('linear: got client');

    yield* Effect.tryPromise({
      try: async () => {
        const space = await waitForSpace(client);
        if (!space) {
          console.warn('linear: no space found after waiting');
          return;
        }
        console.log('linear: space ready, starting sync');

        await syncOnce(client);

        setInterval(async () => {
          try {
            await syncOnce(client);
          } catch (error) {
            log.warn('linear: periodic sync failed', { error: error instanceof Error ? error.message : String(error) });
          }
        }, SYNC_INTERVAL_MS);
      },
      catch: (error: unknown) => {
        console.error('linear: initial sync failed', error instanceof Error ? error.message : String(error));
        return new Error(error instanceof Error ? error.message : String(error));
      },
    });
  }),
);
