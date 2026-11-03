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

/** The part of the operation invoker a person's edit needs. */
export type InvokeOperation = (
  op: Operation.Definition.Any,
  input: unknown,
  options?: { spaceId?: SpaceId },
) => Promise<{ error?: Error }>;

/**
 * A person's edit. Their `done` is their sign-off, so it closes the task through `AcceptTask` rather than landing it in
 * `review` as an agent's `done` does, once the patch's other fields are written; a refused write signs nothing off.
 */
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

/** A person's edit from the task UI (see {@link applyPersonEdit}). */
export const useTaskUpdate = (spaceId: SpaceId | undefined): ((task: Task.Task, patch: Task.Edit) => void) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  return useCallback(
    (task: Task.Task, patch: Task.Edit) => void applyPersonEdit(invokePromise, task, patch, spaceId),
    [invokePromise, spaceId],
  );
};
