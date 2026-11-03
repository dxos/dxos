//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Ref } from '@dxos/echo';
import { messageOf } from '@dxos/errors';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Task } from '@dxos/types';

import { meta } from '#meta';
import { TaskOperation } from '#types';

/**
 * A person's edit: their `done` is a sign-off, so it closes the task through `AcceptTask` rather than `UpdateTask`.
 * A refused write is shown, since the form has already let go of the edit.
 */
export const useTaskUpdate = (spaceId: SpaceId | undefined) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  return useCallback(
    async (task: Task.Task, { status, ...patch }: Task.Edit) => {
      const updated = await invokePromise(
        TaskOperation.UpdateTask,
        { task: Ref.make(task), ...patch, ...(status !== 'done' && { status }) },
        { spaceId },
      );
      const error =
        updated.error ??
        (status === 'done'
          ? (await invokePromise(TaskOperation.AcceptTask, { task: Ref.make(task) }, { spaceId })).error
          : undefined);
      if (error) {
        log.warn('task update rejected', { task: task.id, error });
        void invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}/update-task-error`,
          icon: 'ph--warning--regular',
          duration: 5_000,
          title: ['update-task-error.title', { ns: meta.profile.key }],
          description: messageOf(error) ?? String(error),
          closeLabel: ['close.label', { ns: meta.profile.key }],
        });
      }
    },
    [invokePromise, spaceId],
  );
};
