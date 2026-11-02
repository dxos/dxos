//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Ref } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { type Task } from '@dxos/types';

import { TaskOperation } from '#types';

/**
 * A person's edit from the task UI. Their `done` is their sign-off, so it closes the task through
 * `AcceptTask` rather than landing it in `review` as an agent's `done` does; every other field is an
 * ordinary `UpdateTask`.
 */
export const useTaskUpdate = (spaceId: SpaceId | undefined): ((task: Task.Task, patch: Task.Edit) => void) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  return useCallback(
    (task: Task.Task, { status, ...patch }: Task.Edit) => {
      const fields = status === undefined || status === 'done' ? patch : { ...patch, status };
      void (async () => {
        if (Object.values(fields).some((value) => value !== undefined)) {
          await invokePromise(TaskOperation.UpdateTask, { task: Ref.make(task), ...fields }, { spaceId });
        }
        if (status === 'done') {
          await invokePromise(TaskOperation.AcceptTask, { task: Ref.make(task) }, { spaceId });
        }
      })();
    },
    [invokePromise, spaceId],
  );
};
