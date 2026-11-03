//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Operation from '@dxos/compute/Operation';
import { Ref } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { type Task } from '@dxos/types';

import { TaskOperation } from '#types';

export type InvokeOperation = (
  op: Operation.Definition.Any,
  input: unknown,
  options?: { spaceId?: SpaceId },
) => Promise<{ error?: Error }>;

export const applyPersonEdit = async (
  invoke: InvokeOperation,
  task: Task.Task,
  { status, ...patch }: Task.Edit,
  spaceId: SpaceId | undefined,
): Promise<void> => {
  const fields = status === undefined || status === 'done' ? patch : { ...patch, status };
  if (Object.values(fields).some((value) => value !== undefined)) {
    const { error } = await invoke(TaskOperation.UpdateTask, { task: Ref.make(task), ...fields }, { spaceId });
    if (error) {
      return;
    }
  }
  if (status === 'done') {
    await invoke(TaskOperation.AcceptTask, { task: Ref.make(task) }, { spaceId });
  }
};

export const useTaskUpdate = (spaceId: SpaceId | undefined): ((task: Task.Task, patch: Task.Edit) => void) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  return useCallback(
    (task: Task.Task, patch: Task.Edit) => void applyPersonEdit(invokePromise, task, patch, spaceId),
    [invokePromise, spaceId],
  );
};
