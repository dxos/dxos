//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ActionMenu, type MenuAction, createMenuAction } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Container from '@dxos/react-ui/Container';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Typography from '@dxos/react-ui/Typography';
import type * as Util from '@dxos/react-ui/Util';
import { Person, Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { TASK_GRID, TASK_GRID_ICON } from '../task-grid.ts';
import { PERSON_ICON, shortDid } from './assignee.ts';
import {
  UNSET_ICON,
  estimateTextStyle,
  priorityIcon,
  priorityTextStyle,
  statusIcon,
  statusTextStyle,
} from './status-icons.ts';
import { useAssigneeDisplay } from './useAssigneeDisplay.ts';

/** The glyph for an estimate, which the list renders as letters and has none of its own. */
const ESTIMATE_ICON = 'ph--ruler--regular';

/** A member of the task's space, offered as an assignee by identity. */
export type TaskMember = { did: string; name?: string };

export type TaskPropertiesProps = Util.ThemedClassName<{
  task: Task.Task;
  /**
   * The space's members, the owner among them. Passed in rather than read here: membership lives in
   * HALO, which this package does not depend on.
   */
  members?: readonly TaskMember[];
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
export const TaskProperties = ({ task, members = [], onTaskUpdate, classNames }: TaskPropertiesProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const status = task.status ?? 'todo';
  const priority = task.priority ?? undefined;
  const estimate = task.estimate ?? undefined;
  const assignee = task.assignee ?? undefined;

  // The people the space knows, for the picker. Queried rather than read off refs: a contact's
  // target is not in memory on a cold load, and the picker must offer everyone, not only whoever
  // some task already points at.
  const db = Obj.getDatabase(task);
  const people = useQuery(onTaskUpdate ? db : undefined, Filter.type(Person.Person));
  const { label: assigneeLabel, icon: assigneeIcon } = useAssigneeDisplay(assignee);
  const { createdAt } = Obj.getMeta(task);

  return (
    // A section of the host Container: it inherits the host's tracks, so its glyphs share the pane's gutter.
    <Container.Container asChild gutter='inherit' gap='sm' classNames={classNames} data-testid='taskList.properties'>
      <section>
        <Typography.Text asChild tone='subtle' classNames='text-sm'>
          <h2>{t('task-properties.label')}</h2>
        </Typography.Text>
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
            (() =>
              Task.StatusOptions.map(({ id }) =>
                createMenuAction(`status-${id}`, () => onTaskUpdate(task, { status: id }), {
                  label: t(`status-${id}.label`),
                  icon: statusIcon(id),
                  iconClassNames: statusTextStyle(id),
                  checked: status === id,
                }),
              ))
          }
        />

        <TaskProperty
          icon={assignee ? assigneeIcon : UNSET_ICON}
          label={assigneeLabel ?? t('set-assignee.label')}
          unset={!assignee}
          testId='taskList.property.assignee'
          actions={
            onTaskUpdate &&
            (() => [
              createMenuAction('assignee-none', () => onTaskUpdate(task, { assignee: null }), {
                label: t('assignee-none.label'),
                checked: !assignee,
              }),
              // An assignee the people list cannot show — an agent, or an actor with no contact — is
              // listed as itself, so the picker says who holds the task before it is switched away.
              ...(assignee &&
              !assignee.contact &&
              !members.some((member) => member.did === assignee.identityDid) &&
              assigneeLabel
                ? [
                    createMenuAction('assignee-current', () => {}, {
                      label: assigneeLabel,
                      icon: assigneeIcon,
                      checked: true,
                      testId: 'taskList.assignee.current',
                    }),
                  ]
                : []),
              // The space's members first — the people who can actually pick the task up — then its
              // contacts. Both are what the field accepts, as the status and priority pickers offer.
              ...members.map((member) =>
                createMenuAction(
                  `assignee-member-${member.did}`,
                  () => onTaskUpdate(task, { assignee: { identityDid: member.did, name: member.name } }),
                  {
                    label: member.name ?? shortDid(member.did),
                    icon: PERSON_ICON,
                    checked: assignee?.identityDid === member.did,
                    testId: 'taskList.assignee.member',
                  },
                ),
              ),
              ...people.map((person) =>
                createMenuAction(
                  `assignee-${person.id}`,
                  () => onTaskUpdate(task, { assignee: { contact: Ref.make(person) } }),
                  {
                    label: Obj.getLabel(person) ?? person.id,
                    icon: PERSON_ICON,
                    checked: Task.refEntityId(assignee?.contact) === person.id,
                  },
                ),
              ),
            ])
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
            (() =>
              [Task.NullOption, ...Task.PriorityOptions].map(({ id, icon }) =>
                createMenuAction(`priority-${id}`, () => onTaskUpdate(task, { priority: id === 'none' ? null : id }), {
                  label: t(`priority-${id}.label`),
                  icon,
                  iconClassNames: priorityTextStyle(id),
                  checked: (priority ?? 'none') === id,
                }),
              ))
          }
        />

        <TaskProperty
          icon={estimate ? ESTIMATE_ICON : UNSET_ICON}
          iconClassNames={estimateTextStyle(estimate)}
          label={estimate ? estimate.toUpperCase() : t('set-estimate.label')}
          unset={!estimate}
          testId='taskList.property.estimate'
          actions={
            onTaskUpdate &&
            (() =>
              [Task.NullOption, ...Task.EstimateOptions].map(({ id, title }) =>
                createMenuAction(`estimate-${id}`, () => onTaskUpdate(task, { estimate: id === 'none' ? null : id }), {
                  label: title,
                  checked: (estimate ?? 'none') === id,
                }),
              ))
          }
        />
      </section>
    </Container.Container>
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
  actions?: () => MenuAction[];
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
      <Button.Button
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
      </Button.Button>
    </ActionMenu>
  );
};
