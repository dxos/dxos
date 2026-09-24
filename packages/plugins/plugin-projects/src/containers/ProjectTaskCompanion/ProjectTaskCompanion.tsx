//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
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
    return (
      <Flex justify='center' classNames='p-4 text-subdued'>
        {t('no-task-selected.message')}
      </Flex>
    );
  }

  return (
    // The article takes the room; the stack sits under it, sized by its cards and scrolling within
    // its own half once there are more than the companion can show.
    <Flex column grow classNames='min-h-0'>
      <Flex grow column classNames='min-h-0'>
        <Surface.Surface
          type={AppSurface.Article}
          data={{ subject: task, attendableId: `${attendableId}/task` }}
          limit={1}
          role={role}
        />
      </Flex>
      {/* What the task produced, as cards. `plugin-space` renders the stack; nothing shows for a
          task with no artifacts, so the article keeps the whole companion until there are some. */}
      <Surface.Surface
        type={AppSurface.CardStack}
        data={{ objects: artifacts ?? [], attendableId }}
        limit={1}
        classNames='max-h-[50%] border-t border-separator'
      />
    </Flex>
  );
};

ProjectTaskCompanion.displayName = 'ProjectTaskCompanion';
