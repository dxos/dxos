//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Flex, useTranslation } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { Task } from '@dxos/types';

import { meta } from '#meta';

export type ProjectTaskCompanionProps = {
  role: string;
  /** The plank this companion is anchored to — the project's, and the context its selection lives in. */
  attendableId: string;
  project: Project.Project;
};

/**
 * The selected task, beside the project rather than in place of it.
 *
 * The companion is one fixed slot, so it reads which task to show from the ledger's own selection
 * (published by `TaskSetArticle` through `LayoutOperation.Select`) rather than carrying a subject of
 * its own. It renders the task through the article surface, so the detail is the same component the
 * deck mounts when a task is opened as a plank on a narrow screen.
 */
export const ProjectTaskCompanion = ({ role, attendableId, project }: ProjectTaskCompanionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const taskSet = project.taskSet?.target;
  const db = Obj.getDatabase(project);
  const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filter.childOf(taskSet)) : Filter.nothing());
  const selected = useSelection(attendableId, 'single');
  const task = tasks.find(({ id }) => id === selected);

  if (!task) {
    return (
      <Flex justify='center' classNames='p-4 text-subdued'>
        {t('no-task-selected.message')}
      </Flex>
    );
  }

  return (
    <Surface.Surface
      type={AppSurface.Article}
      data={{ subject: task, attendableId: `${attendableId}/task` }}
      limit={1}
      role={role}
    />
  );
};

ProjectTaskCompanion.displayName = 'ProjectTaskCompanion';
