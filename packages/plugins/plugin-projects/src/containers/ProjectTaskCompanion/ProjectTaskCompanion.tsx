//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { Flex, Splitter, useTranslation } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { Task } from '@dxos/types';

import { ObjectGallery } from '#components';
import { meta } from '#meta';

/** The artifacts pane's initial height in rem: a couple of rows of mini cards and the heading. */
const ARTIFACTS_SIZE = 10;

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
 * deck mounts when a task is opened as a plank on a narrow screen. What the task produced sits under
 * the detail as mini cards, since the companion has the room the ledger row does not.
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

  if (!task) {
    return (
      <Flex justify='center' classNames='p-4 text-subdued'>
        {t('no-task-selected.message')}
      </Flex>
    );
  }

  return <TaskDetail role={role} attendableId={attendableId} task={task} />;
};

ProjectTaskCompanion.displayName = 'ProjectTaskCompanion';

type TaskDetailProps = Pick<ProjectTaskCompanionProps, 'role' | 'attendableId'> & { task: Task.Task };

/** Split out so the artifacts subscription is on the task once one is selected, not on the empty state. */
const TaskDetail = ({ role, attendableId, task }: TaskDetailProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const [artifacts = []] = useObject(task, 'artifacts');

  // Opened beside the project rather than over it, as the project's own artifact gallery does.
  const handleOpen = useCallback(
    (object: Obj.Unknown) => {
      void invokePromise(LayoutOperation.Open, {
        subject: [GraphPath.getObjectPathFromObject(object)],
        pivotId: attendableId,
        disposition: 'add',
        navigation: 'immediate',
      });
    },
    [invokePromise, attendableId],
  );

  return (
    // One splitter whether or not there are artifacts, so the article keeps the pane it lays out in.
    <Splitter.Root
      orientation='vertical'
      anchor='end'
      resizable
      defaultSize={ARTIFACTS_SIZE}
      mode={artifacts.length > 0 ? 'split' : 'start'}
    >
      <Splitter.Panel position='start'>
        <Surface.Surface
          type={AppSurface.Article}
          data={{ subject: task, attendableId: `${attendableId}/task` }}
          limit={1}
          role={role}
        />
      </Splitter.Panel>
      <Splitter.Handle />
      <Splitter.Panel position='end'>
        <Flex column classNames='h-full min-h-0 dx-base-surface' data-testid='projectsPlugin.taskArtifacts'>
          <h2 className='shrink-0 px-2 pt-2 text-sm text-description'>{t('artifacts.label')}</h2>
          <ObjectGallery refs={artifacts} compact scroll onOpen={handleOpen} />
        </Flex>
      </Splitter.Panel>
    </Splitter.Root>
  );
};

TaskDetail.displayName = 'TaskDetail';
