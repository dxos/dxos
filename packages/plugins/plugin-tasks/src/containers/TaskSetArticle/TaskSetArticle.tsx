//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Icon, Panel, Tag, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { Listbox } from '@dxos/react-ui-list';
import { type Actor, Task, type TaskSet } from '@dxos/types';

import { meta } from '#meta';

export type TaskSetArticleProps = AppSurface.ObjectArticleProps<TaskSet.TaskSet>;

/** Linear-style status groups, most active first. */
const STATUS_ORDER: NonNullable<Task.Task['status']>[] = ['in-progress', 'todo', 'done', 'failed', 'cancelled'];

/**
 * Status-grouped list of a task set's root tasks (children by the ECHO parent edge).
 */
export const TaskSetArticle = ({ role, attendableId, subject: taskSet }: TaskSetArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { hasAttention } = useAttention(attendableId);
  const space = getSpace(taskSet);

  const children = useQuery(space?.db, Query.select(Filter.id(taskSet.id)).children());
  const groups = useMemo(() => {
    const tasks = children.filter((child): child is Task.Task => Obj.instanceOf(Task.Task, child));
    return STATUS_ORDER.map((status) => ({
      status,
      tasks: tasks.filter((task) => (task.status ?? 'todo') === status),
    })).filter((group) => group.tasks.length > 0);
  }, [children]);

  const content = (
    <Listbox.Root>
      <Listbox.Viewport classNames='dx-container'>
        <Listbox.Content aria-label={t('task-set.tasks.label')}>
          {groups.map(({ status, tasks }) => (
            <React.Fragment key={status}>
              <div className='px-2 pt-3 pb-1 text-xs text-subdued uppercase'>{t(`task-status.${status}.label`)}</div>
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </React.Fragment>
          ))}
        </Listbox.Content>
      </Listbox.Viewport>
    </Listbox.Root>
  );

  // Embedded as a section (e.g. the ProjectArticle Tasks section): the host owns scroll and
  // chrome, so render the bare grouped list — a nested Panel/scroll root would collapse width.
  if (role === AppSurface.Section.role) {
    return content;
  }

  return (
    <Panel.Root role={role} classNames='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root disabled={!hasAttention} />
      </Panel.Toolbar>
      <Panel.Content>{content}</Panel.Content>
    </Panel.Root>
  );
};

TaskSetArticle.displayName = 'TaskSetArticle';

const TaskRow = ({ task }: { task: Task.Task }) => {
  const done = task.status === 'done';
  return (
    <Listbox.Item id={task.id} classNames='py-0'>
      <div className='flex items-center gap-2 min-w-0'>
        <Icon
          icon={done ? 'ph--check--regular' : 'ph--circle--regular'}
          classNames={done ? 'text-success-text' : undefined}
          size={4}
        />
        <span className='truncate flex-1'>{task.title}</span>
        {task.priority && task.priority !== 'none' && <Tag hue='neutral'>{task.priority}</Tag>}
        {task.assignee && <AssigneeChip assignee={task.assignee} />}
      </div>
    </Listbox.Item>
  );
};

/**
 * Actor-aware assignee chip: a Person ref resolves to the contact's name; otherwise fall back to
 * name, email, or a shortened DID; agents (`role: 'assistant'`) are marked with a sparkle.
 */
const AssigneeChip = ({ assignee }: { assignee: Actor.Actor }) => {
  const [contact] = useObject(assignee.contact);
  const label =
    contact?.fullName ??
    assignee.name ??
    assignee.email ??
    (assignee.identityDid ? shortDid(assignee.identityDid) : undefined);
  const agent = assignee.role === 'assistant';
  if (!label && !agent) {
    return null;
  }

  return (
    <Tag hue={agent ? 'purple' : 'indigo'}>
      {agent && <Icon icon='ph--sparkle--regular' size={3} classNames='inline-block me-1' />}
      {label ?? 'agent'}
    </Tag>
  );
};

const shortDid = (did: string): string => `${did.slice(0, 12)}…`;
