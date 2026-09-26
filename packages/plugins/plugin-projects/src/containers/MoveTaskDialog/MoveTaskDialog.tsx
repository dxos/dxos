//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { log } from '@dxos/log';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';
import { Dialog, useTranslation } from '@dxos/react-ui';
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
      void (async () => {
        await invokePromise(TaskOperation.MoveTaskToSet, { task: Ref.make(task), taskSet }, { spaceId: db.spaceId });
        await invokePromise(LayoutOperation.UpdateDialog, { state: false });
      })().catch((err) => log.warn('move task failed', { err }));
    },
    [invokePromise, task, db],
  );

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('move-task-dialog.title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.ActionIconButton action='close' />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <MoveTaskPanel projects={candidates} onSelect={handleSelect} />
      </Dialog.Body>
    </Dialog.Content>
  );
};

MoveTaskDialog.displayName = 'MoveTaskDialog';
