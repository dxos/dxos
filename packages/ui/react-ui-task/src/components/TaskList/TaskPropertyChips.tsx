//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { ActionMenu, type MenuAction } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import { type Actor, type Person, type Task } from '@dxos/types';
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

export type TaskPropertyValues = {
  status?: Task.Status;
  priority?: Task.Priority;
  estimate?: Task.Estimate;
  assignee?: Actor.Actor;
};

export type TaskPropertyChipsProps = {
  values: TaskPropertyValues;
  members: readonly TaskMember[];
  /** The space's contacts, read when the assignee picker opens. */
  people: () => readonly Person.Person[];
  onChange: (patch: Task.Edit) => void;
};

/**
 * The editor's fields beyond the title, as a row of chips under it, after Linear's composer: each names its value, or
 * its field while unset, and opens the same picker the row and the properties panel do.
 */
export const TaskPropertyChips = ({ values, members, people, onChange }: TaskPropertyChipsProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const { status = 'todo', priority, estimate, assignee } = values;
  const { label: assigneeLabel, icon: assigneeIcon } = useAssigneeDisplay(assignee);

  return (
    <>
      <TaskPropertyChip
        icon={statusIcon(status)}
        iconClassNames={statusTextStyle(status)}
        label={t(`status-${status}.label`)}
        testId='taskList.edit.status'
        actions={() => statusMenuActions({ status, onChange: (status) => onChange({ status }), t })}
      />
      <TaskPropertyChip
        icon={priorityIcon(priority)}
        iconClassNames={priorityTextStyle(priority)}
        label={priority ? t(`priority-${priority}.label`) : t('task-priority.label')}
        unset={!priority}
        testId='taskList.edit.priority'
        actions={() => priorityMenuActions({ priority, onChange: (priority) => onChange({ priority }), t })}
      />
      <TaskPropertyChip
        icon={assignee ? assigneeIcon : UNASSIGNED_ICON}
        label={(assignee && assigneeLabel) || t('task-assignee.label')}
        unset={!assignee}
        testId='taskList.edit.assignee'
        actions={() =>
          assigneeMenuActions({
            assignee,
            current: { label: assigneeLabel, icon: assigneeIcon },
            members,
            people: people(),
            onChange: (assignee) => onChange({ assignee }),
            t,
          })
        }
      />
      <TaskPropertyChip
        icon={ESTIMATE_ICON}
        iconClassNames={estimateTextStyle(estimate)}
        label={estimate ? estimate.toUpperCase() : t('task-estimate.label')}
        unset={!estimate}
        testId='taskList.edit.estimate'
        actions={() => estimateMenuActions({ estimate, onChange: (estimate) => onChange({ estimate }) })}
      />
    </>
  );
};

type TaskPropertyChipProps = {
  icon: string;
  iconClassNames?: string;
  label: string;
  /** No value yet: the chip names its field, muted, as an invitation rather than a value. */
  unset?: boolean;
  testId: string;
  actions: () => MenuAction[];
};

const TaskPropertyChip = ({ icon, iconClassNames, label, unset, testId, actions }: TaskPropertyChipProps) => (
  <ActionMenu deferUntilOpen actions={actions}>
    <Button.Root
      variant='ghost'
      size='sm'
      // Out of the tab order: Tab runs from the title into the description, and the pickers are reached by pointer.
      tabIndex={-1}
      classNames='gap-1.5 px-2 rounded-full border border-separator min-w-0'
      data-testid={testId}
      // Opening a picker must not take focus from the field being typed into.
      onMouseDown={(event) => event.preventDefault()}
    >
      <Icon.Icon icon={icon} classNames={mx(unset ? 'text-fg-muted' : iconClassNames)} />
      <span className={mx('text-sm truncate', unset && 'text-fg-muted')}>{label}</span>
    </Button.Root>
  </ActionMenu>
);
