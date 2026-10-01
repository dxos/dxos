//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { log } from '@dxos/log';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';
import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { Task } from '@dxos/types';

import { MoveTaskPanel } from '#components';
import { meta } from '#meta';

export type MoveTaskDialogProps = {
  task: Task.Task;
};

/** Picks the project a task (with its sub-tasks) moves into, then runs `MoveTaskToSet`. */
export const MoveTaskDialog = ({ task }: MoveTaskDialogProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(task);
  const [error, setError] = useState<string>();
  const projects = useQuery(db, Filter.type(Project.Project));

  // The task's set is its ECHO parent, so its own project is the one owning that set; a project
  // without a task set has nowhere to file the task.
  const currentSetId = Obj.getParent(task)?.id;
  const candidates = useMemo(
    () =>
      projects.filter((project) => {
        const taskSetId = Task.refEntityId(project.taskSet);
        return taskSetId !== undefined && taskSetId !== currentSetId;
      }),
    [projects, currentSetId],
  );

  const handleSelect = useCallback(
    (project: Project.Project) => {
      const taskSet = project.taskSet;
      if (!taskSet || !db) {
        return;
      }
      setError(undefined);
      void (async () => {
        // `invokePromise` resolves with the failure rather than rejecting, so it is checked here: a
        // failed move keeps the dialog open with the reason instead of closing as if it had worked.
        const { error } = await invokePromise(
          TaskOperation.MoveTaskToSet,
          { task: Ref.make(task), taskSet },
          { spaceId: db.spaceId },
        );
        if (error) {
          log.warn('move task failed', { error });
          setError(error.message);
          return;
        }
        await invokePromise(LayoutOperation.UpdateDialog, { state: false });
      })();
    },
    [invokePromise, task, db],
  );

  return (
    <Next.Dialog.Content>
      <Next.Dialog.Header>
        <Next.Dialog.Title>{t('move-task-dialog.title')}</Next.Dialog.Title>
        <Next.Dialog.CloseTrigger asChild>
          <Next.SystemButton.Close />
        </Next.Dialog.CloseTrigger>
      </Next.Dialog.Header>
      <Next.Dialog.Body>
        {error && (
          <Next.Banner.Root valence='error'>
            <Next.Banner.Title icon='ph--warning--regular'>{t('move-task-error.title')}</Next.Banner.Title>
            <Next.Banner.Body>{error}</Next.Banner.Body>
          </Next.Banner.Root>
        )}
        <MoveTaskPanel projects={candidates} onSelect={handleSelect} />
      </Next.Dialog.Body>
    </Next.Dialog.Content>
  );
};

MoveTaskDialog.displayName = 'MoveTaskDialog';
