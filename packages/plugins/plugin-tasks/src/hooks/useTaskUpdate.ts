//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Ref } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { type Task } from '@dxos/types';

import { TaskOperation } from '#types';

/** A person's edit: their `done` is a sign-off, so it closes the task through `AcceptTask` rather than `UpdateTask`. */
export const useTaskUpdate = (spaceId: SpaceId | undefined) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  return useCallback(
    async (task: Task.Task, { status, ...patch }: Task.Edit) => {
      const { error } = await invokePromise(
        TaskOperation.UpdateTask,
        { task: Ref.make(task), ...patch, ...(status !== 'done' && { status }) },
        { spaceId },
      );
      if (!error && status === 'done') {
        await invokePromise(TaskOperation.AcceptTask, { task: Ref.make(task) }, { spaceId });
      }
    },
    [invokePromise, spaceId],
  );
};
