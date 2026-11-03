//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { ActionMenu, type MenuItem } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';
import type * as Util from '@dxos/react-ui/Util';
import { Person, Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { useAssigneeDisplay } from '../../hooks/index.ts';
import { UNASSIGNED_ICON } from '../../util/assignee.ts';
import {
  type TaskMember,
  assigneeMenuActions,
  estimateMenuActions,
  priorityMenuActions,
  statusMenuActions,
} from '../../util/property-menus.ts';
import {
  ESTIMATE_ICON,
  estimateTextStyle,
  priorityIcon,
  priorityTextStyle,
  statusIcon,
  statusTextStyle,
} from '../../util/status-icons.ts';
import { TASK_GRID, TASK_GRID_ICON } from '../task-grid.ts';
import { TaskMnemonic } from '../TaskList/TaskRowCells.tsx';

export type { TaskMember };

export type TaskPropertiesProps = Util.ThemedClassName<{
  task: Task.Task;
  /**
   * The space's members, the owner among them. Passed in rather than read here: membership lives in
   * HALO, which this package does not depend on.
   */
  members?: readonly TaskMember[];
  /** The agents the assignee picker can hand the task to, listed after the people. */
  delegateActions?: MenuItem[];
  /** Absent renders the properties read-only, as the list's readonly cells do. */
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
}>;

/**
 * A task's own fields as a labelled list: one row each for status, priority and estimate, the glyph
 * naming the field and the value beside it.
 *
 * A list rather than the row of icon buttons the task list uses. A row has one line and many tasks,
 * so a glyph alone is the only thing that fits and the reader learns the ramp; a detail pane has one
 * task and the room to say what the glyph means — and an unset field can then invite the value
 * ("Set estimate") instead of showing a dot that reads as a value of its own.
 */
export const TaskProperties = ({
  task,
  members = [],
  delegateActions,
  onTaskUpdate,
  classNames,
}: TaskPropertiesProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const [storedStatus] = useObject(task, 'status');
  const [storedPriority] = useObject(task, 'priority');
  const [storedEstimate] = useObject(task, 'estimate');
  const [storedAssignee] = useObject(task, 'assignee');
  const [storedDelegate] = useObject(task, 'delegate');
  const status = storedStatus ?? 'todo';
  const priority = storedPriority ?? undefined;
  const estimate = storedEstimate ?? undefined;
  const assignee = storedAssignee ?? undefined;
  const delegate = storedDelegate ?? undefined;

  // The people the space knows, for the picker. Queried rather than read off refs: a contact's
  // target is not in memory on a cold load, and the picker must offer everyone, not only whoever
  // some task already points at.
  const db = Obj.getDatabase(task);
  const people = useQuery(onTaskUpdate ? db : undefined, Filter.type(Person.Person));
  const { label: assigneeLabel, icon: assigneeIcon } = useAssigneeDisplay(assignee);
  const { label: delegateLabel, icon: delegateIcon } = useAssigneeDisplay(delegate);
  const { createdAt } = Obj.getMeta(task);

  return (
    // A section of the host Container: it inherits the host's tracks, so its glyphs share the pane's gutter.
    <Layout.Container asChild gutter='inherit' gap='sm' classNames={classNames} data-testid='taskList.properties'>
      <section>
        {/* Set as the form's field labels are, so the article's section headings read as one with them. */}
        <Typography.Text asChild tone='subtle' classNames='dx-label py-0'>
          <h2>{t('task-properties.label')}</h2>
        </Typography.Text>
        {/* The task's reference first: what names it, and the button that copies it, in the glyph column. */}
        <div
          className={mx(TASK_GRID, 'items-center min-h-(--dx-control-sm) min-w-0')}
          data-testid='taskList.property.reference'
        >
          <div className={TASK_GRID_ICON}>
            <TaskMnemonic task={task} />
          </div>
          <Typography.Text tone='muted' classNames='text-sm'>
            {Obj.getMnemonic(task)}
          </Typography.Text>
        </div>
        {createdAt !== undefined && (
          <TaskProperty
            icon='ph--calendar-plus--regular'
            label={<Typography.Timestamp date={createdAt} />}
            unset
            testId='taskList.property.created'
          />
        )}

        <TaskProperty
          icon={statusIcon(status)}
          iconClassNames={statusTextStyle(status)}
          label={t(`status-${status}.label`)}
          testId='taskList.property.status'
          actions={
            onTaskUpdate &&
            (() => statusMenuActions({ status, onChange: (status) => onTaskUpdate(task, { status }), t }))
          }
        />

        {/* One row for who holds the task: the person who answers for it, badged by name with any agent at work. */}
        <TaskProperty
          icon={assignee ? assigneeIcon : delegate ? delegateIcon : UNASSIGNED_ICON}
          label={
            assignee && delegate
              ? t('delegated.label', { assignee: assigneeLabel ?? '', delegate: delegateLabel ?? '' })
              : ((assignee ? assigneeLabel : delegateLabel) ?? t('set-assignee.label'))
          }
          unset={!assignee && !delegate}
          testId='taskList.property.assignee'
          actions={
            onTaskUpdate &&
            (() =>
              assigneeMenuActions({
                assignee,
                current: { label: assigneeLabel, icon: assigneeIcon },
                delegate: delegate && { label: delegateLabel, icon: delegateIcon },
                members,
                people,
                agents: delegateActions,
                onChange: (patch) => onTaskUpdate(task, patch),
                t,
              }))
          }
        />

        <TaskProperty
          icon={priorityIcon(priority)}
          iconClassNames={priorityTextStyle(priority)}
          label={priority ? t(`priority-${priority}.label`) : t('set-priority.label')}
          unset={!priority}
          testId='taskList.property.priority'
          actions={
            onTaskUpdate &&
            (() => priorityMenuActions({ priority, onChange: (priority) => onTaskUpdate(task, { priority }), t }))
          }
        />

        <TaskProperty
          icon={ESTIMATE_ICON}
          iconClassNames={estimateTextStyle(estimate)}
          label={estimate ? estimate.toUpperCase() : t('set-estimate.label')}
          unset={!estimate}
          testId='taskList.property.estimate'
          actions={
            onTaskUpdate &&
            (() => estimateMenuActions({ estimate, onChange: (estimate) => onTaskUpdate(task, { estimate }) }))
          }
        />
      </section>
    </Layout.Container>
  );
};

TaskProperties.displayName = 'TaskList.Properties';

type TaskPropertyProps = {
  icon: string;
  iconClassNames?: string;
  label: ReactNode;
  /** No value yet: the label invites one, so it reads as a prompt rather than as the value. */
  unset?: boolean;
  testId: string;
  /** Absent renders the row as text — the readonly case, and the row is then not a button. */
  actions?: () => MenuItem[];
};

const TaskProperty = ({ icon, iconClassNames, label, unset, testId, actions }: TaskPropertyProps) => {
  const content = (
    <>
      {/* Unset takes the label's own hue, not the value palette's neutral: they are different
          greys, and with the same asterisk on both rows the mismatch read as a meaning the rows do
          not carry. A value keeps the hue its option table gives it. */}
      <div className={TASK_GRID_ICON}>
        <Icon.Icon icon={icon} classNames={mx(unset ? 'text-fg-muted' : iconClassNames)} />
      </div>
      <span className={mx('min-w-0 pe-1.5 text-sm truncate', unset && 'text-fg-muted')}>{label}</span>
    </>
  );

  if (!actions) {
    return (
      // The button's own height and centring, so a read-only row lines up with the editable ones.
      <div className={mx(TASK_GRID, 'items-center min-h-(--dx-control-sm) min-w-0')} data-testid={testId}>
        {content}
      </div>
    );
  }

  return (
    // Deferred, as the row's controls are: the menu is built when it is opened, not when the pane
    // renders three of them.
    <ActionMenu deferUntilOpen actions={actions}>
      {/* The button IS the row, so its own box carries the section's grid: a flex button wrapping a
          grid would size the glyph column to the glyph instead of to the shared 24px. `w-fit`, since
          a property is as wide as its value and a full-width button would paint a bar across the
          pane on hover. */}
      <Button.Root
        variant='ghost'
        size='sm'
        // `items-center`, overriding the shared grid's `items-start`: a property is one line, and the
        // button's box is taller than it — top-aligned, its glyph and label sat against the top of
        // the hover surface rather than in it. The wrapping rows (history, a question) keep
        // `items-start`, where a glyph must stay on the first line.
        classNames={mx(TASK_GRID, 'items-center w-fit min-w-0 justify-start px-0')}
        data-testid={testId}
      >
        {content}
      </Button.Root>
    </ActionMenu>
  );
};
