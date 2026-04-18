//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { Kanban } from '@dxos/plugin-kanban/types';
import { ViewModel } from '@dxos/schema';
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
    space.db.add(task);
    added++;
  }

  if (added > 0) {
    log.info('linear: synced issues', { added, total: remoteTasks.length });
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
      space.db.add(kanban);
      log.info('linear: created kanban board');
    } catch (error) {
      log.warn('linear: failed to create kanban', { error: error instanceof Error ? error.message : String(error) });
    }
  }
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);

    yield* Effect.tryPromise({
      try: async () => {
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
        log.warn('linear: initial sync failed', { error: error instanceof Error ? error.message : String(error) });
        return new Error(error instanceof Error ? error.message : String(error));
      },
    });
  }),
);
