//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { Banner, Flex, useTranslation } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { Task } from '@dxos/types';

import { meta } from '#meta';

export type TaskCompanionProps = {
  project: Project.Project;
  role: string;
  /** The plank this companion is anchored to — the project's, and the context its selection lives in. */
  attendableId: string;
};

/**
 * The selected task, beside the project rather than in place of it.
 *
 * The companion is one fixed slot, so it reads which task to show from the ledger's own selection
 * (published by `TaskSetArticle` through `LayoutOperation.Select`) rather than carrying a subject of
 * its own. It renders the task through the article surface, so the detail is the same component the
 * deck mounts when a task is opened as a plank on a narrow screen.
 */
export const TaskCompanion = ({ project, role, attendableId }: TaskCompanionProps) => {
  const { t } = useTranslation(meta.profile.key);
  // Resolved through the hook: on a cold load the ref has no target yet, and a direct read would
  // leave the companion on its empty state once it arrives.
  const taskSet = useResolveRef(project.taskSet);
  const db = Obj.getDatabase(project);
  const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filter.childOf(taskSet)) : Filter.nothing());
  const selected = useSelection(attendableId, 'single');
  const task = tasks.find(({ id }) => id === selected);
  // The property, not the whole task: the query re-emits on membership only, so an artifact recorded
  // on the open task would otherwise not reach the stack until the reader selected away and back.
  // Subscribing to the object itself would hand the article a snapshot in place of the live task.
  const [artifacts] = useObject(task, 'artifacts');

  if (!task) {
    return <Banner.Empty label={t('no-task-selected.message')} />;
  }

  return (
    <Flex column grow>
      <Surface.Surface
        type={AppSurface.Article}
        data={{ subject: task, attendableId: `${attendableId}/task` }}
        role={role}
        limit={1}
      />
      {/* What the task produced, as cards. `plugin-space` renders the grid; nothing shows for a task
          with no artifacts, so the article keeps the whole companion until there are some. */}
      <Surface.Surface type={AppSurface.CardMasonry} data={{ objects: artifacts ?? [], attendableId }} limit={1} />
    </Flex>
  );
};

TaskCompanion.displayName = 'TaskCompanion';
