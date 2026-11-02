//
// Copyright 2026 DXOS.org
//

import React, { createContext, useCallback, useContext, useMemo } from 'react';

import { Type } from '@dxos/echo';
import { Form, type FormFieldOverride, type FormFieldRendererProps, type FormUpdateMeta } from '@dxos/react-ui-form';
import { ActionMenu } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import { type Actor, type Person, Task } from '@dxos/types';

import { translationKey } from '#translations';

import { useAssigneeDisplay } from '../../hooks/index.ts';
import { UNASSIGNED_ICON } from '../../util/assignee.ts';
import { type TaskMember, assigneeMenuActions } from '../../util/property-menus.ts';
import { ESTIMATE_ICON, UNSET_ICON } from '../../util/status-icons.ts';

export type TaskPropertyValues = {
  status?: Task.Status;
  priority?: Task.Priority;
  estimate?: Task.Estimate;
  assignee?: Actor.Actor;
};

export type TaskPropertyPillsProps = {
  values: TaskPropertyValues;
  members: readonly TaskMember[];
  /** The space's contacts, read when the assignee picker opens. */
  people: () => readonly Person.Person[];
  onChange: (patch: Task.Edit) => void;
};

const TASK_SCHEMA = Type.getSchema(Task.Task);

const FIELDS = ['status', 'priority', 'assignee', 'estimate'];

/**
 * The editor's fields beyond the title, as a row of pills under it, after Linear's composer: a form over the task's
 * schema in the `pill` presentation, so each names its value (or its field while unset) and opens its options.
 */
export const TaskPropertyPills = ({ values, members, people, onChange }: TaskPropertyPillsProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const fieldOverrides = useMemo<Record<string, FormFieldOverride>>(
    () => ({
      // A task always has a status (unset reads as Todo), so its pill offers no "None".
      status: { required: true },
      priority: { label: t('task-priority.label'), icon: UNSET_ICON },
      assignee: { label: t('task-assignee.label') },
      estimate: { label: t('task-estimate.label'), icon: ESTIMATE_ICON },
    }),
    [t],
  );
  const pickers = useMemo(() => ({ members, people }), [members, people]);

  // Each change names the one path it set; an unset value is sent as `null`, which clears the field.
  const handleValuesChanged = useCallback(
    (next: Partial<Task.Task>, { changed }: FormUpdateMeta<Task.Task>) =>
      onChange(
        Object.fromEntries(Object.keys(changed).map((key) => [key, next[key as keyof Task.Task] ?? null])) as Task.Edit,
      ),
    [onChange],
  );

  return (
    <AssigneePickersContext.Provider value={pickers}>
      <Form.Root
        schema={TASK_SCHEMA}
        values={{ status: 'todo', ...values }}
        layout='pill'
        fieldOverrides={fieldOverrides}
        fieldMap={FIELD_MAP}
        onValuesChanged={handleValuesChanged}
      >
        <Form.Fields include={FIELDS} sort={FIELDS} />
      </Form.Root>
    </AssigneePickersContext.Provider>
  );
};

/** What the assignee pill lists beyond its value, which a field renderer is not given. */
const AssigneePickersContext = createContext<Pick<TaskPropertyPillsProps, 'members' | 'people'>>({
  members: [],
  people: () => [],
});

/**
 * The assignee as a pill. A Button rather than the form's select: the picker lists members, then contacts, each with
 * its own avatar, which a select's flat option list cannot.
 */
const AssigneePill = ({
  type,
  label,
  jsonPath,
  getValue,
  onValueChange,
}: FormFieldRendererProps<Actor.Actor | undefined>) => {
  const { t } = Hooks.useTranslation(translationKey);
  const { members, people } = useContext(AssigneePickersContext);
  const assignee = getValue();
  const current = useAssigneeDisplay(assignee);
  return (
    <ActionMenu
      deferUntilOpen
      actions={() =>
        assigneeMenuActions({
          assignee,
          current,
          members,
          people: people(),
          onChange: (next) => onValueChange(type, next ?? undefined),
          t,
        })
      }
    >
      <Button.Root
        pill
        icon={assignee ? current.icon : UNASSIGNED_ICON}
        label={(assignee && current.label) || label}
        data-placeholder-shown={assignee ? undefined : ''}
        data-testid={jsonPath}
      />
    </ActionMenu>
  );
};

const FIELD_MAP = { assignee: AssigneePill };
